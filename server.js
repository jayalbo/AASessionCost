const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Pricing tiers configuration
const PRICING_TIERS = {
  HD: {
    label: "HD Video",
    cost: 3.99,
    threshold: 0
  },
  FULL_HD: {
    label: "Full HD Video",
    cost: 8.99,
    threshold: 921600 // 1280x720
  },
  TWO_K: {
    label: "2K Video",
    cost: 15.99,
    threshold: 2073600 // 1920x1080
  },
  TWO_K_PLUS: {
    label: "2K+ Video",
    cost: 35.99,
    threshold: 3686400 // 2560x1440
  }
};

// API endpoint for analytics
app.get('/api/analytics', async (req, res) => {
  let totalQueries = 0;
  let queryStartTime = Date.now();
  const { appId, callId, startTime, endTime, multiHost = false, customerId, customerSecret } = req.query;
  let speakers = [];
  let totalCost = 0;
  let aggregatedResolution = 0;
  const disclaimer = `This estimate is based on audience session duration (not subscription). Actual costs may vary based on usage.`;

  if (!appId || !callId || !startTime || !endTime || !customerId || !customerSecret) {
    return res.status(400).json({ error: "Missing query parameters" });
  }

  const config = {
    baseURL: "https://api.agora.io/beta/analytics",
    headers: {
      Authorization: `Basic ${Buffer.from(`${customerId}:${customerSecret}`).toString('base64')}`,
      "Content-Type": "application/json",
    },
  };

  const getSessionDetails = async (appId, callId, startTime, endTime) => {
    let allCallInfo = [];
    let pageNo = 1;
    const pageSize = 100;

    while (true) {
      try {
        totalQueries++;
        const response = await exponentialBackoff(() =>
          axios.get("/call/sessions", {
            ...config,
            params: {
              appid: appId,
              call_id: callId,
              start_ts: startTime,
              end_ts: endTime,
              page_no: pageNo,
              page_size: pageSize,
            },
          }),
        );

        const data = response.data;
        allCallInfo = allCallInfo.concat(data.call_info);
        console.log(
          `Fetched page ${pageNo}, got ${data.call_info.length} records`,
        );

        if (!data.has_more) break;

        pageNo++;
      } catch (error) {
        console.error("Error fetching data:", error.message);
        break;
      }
    }

    return allCallInfo;
  };

  const calculateUserMinutes = (callInfo) => {
    const userMinutes = {};
    callInfo.forEach((user) => {
      if (user?.speaker && !multiHost) {
        speakers[0] = { uid: user.uid, sid: user.sid };
      } else if (user?.speaker && multiHost) {
        speakers.push({ uid: user.uid, sid: user.sid });
      }
      const uid = user.uid;
      const minutes = (user.leave_ts - user.join_ts) / 60;
      if (!userMinutes[uid]) {
        userMinutes[uid] = 0;
      }
      userMinutes[uid] += minutes;
    });
    return userMinutes;
  };

  try {
    const allCallInfo = await getSessionDetails(
      appId,
      callId,
      startTime,
      endTime,
    );

    if (!allCallInfo || allCallInfo.length === 0) {
      return res.status(404).json({ error: "No call data found for the specified parameters" });
    }

    const userMinutes = calculateUserMinutes(allCallInfo);
    const totalMinutes = Object.values(userMinutes).reduce(
      (sum, minutes) => sum + minutes,
      0,
    );

    let responseObj = {
      call_id: callId,
      channel_name: allCallInfo[0].cname,
      total_users_in_call: allCallInfo.length,
      total_accumulated_minutes: Math.ceil(totalMinutes),
      speakers: speakers.map((speaker) => ({
        uid: speaker.uid,
        sid: speaker.sid,
      })),
    };

    if (speakers.length > 0) {
      let speakersList = speakers.map((speaker) => speaker.sid).join(",");

      totalQueries++;
      const speakerResolution = await exponentialBackoff(() =>
        axios.get("/call/metrics", {
          ...config,
          params: {
            appid: appId,
            call_id: callId,
            start_ts: startTime,
            end_ts: endTime,
            sids: speakersList,
          },
        }),
      );

      if (speakerResolution.data.metrics.length > 0) {
        console.log("Speaker resolution data available");

        responseObj.speakers = responseObj.speakers.map((speaker, index) => {
          const speakerData = speakerResolution.data.metrics[index];
          if (speakerData) {
            const filteredData = speakerData.data.filter(
              (item) => item.mid === 20027 || item.mid === 20028,
            );
            let maxWidth = 0;
            let maxHeight = 0;

            filteredData.forEach((item) => {
              if (item.mid === 20027) {
                item.kvs.forEach(([timestamp, width]) => {
                  if (width > maxWidth) {
                    maxWidth = width;
                  }
                });
              } else if (item.mid === 20028) {
                item.kvs.forEach(([timestamp, height]) => {
                  if (height > maxHeight) {
                    maxHeight = height;
                  }
                });
              }
            });

            if (maxWidth > 0 && maxHeight > 0) {
              aggregatedResolution += maxWidth * maxHeight;

              return {
                ...speaker,
                speaker_resolution: {
                  width: maxWidth,
                  height: maxHeight,
                },
              };
            }
          }
          return speaker;
        });
      }
    }

    // Determine pricing tier based on resolution
    let pricingTier = PRICING_TIERS.HD;
    if (aggregatedResolution >= PRICING_TIERS.TWO_K_PLUS.threshold) {
      pricingTier = PRICING_TIERS.TWO_K_PLUS;
    } else if (aggregatedResolution >= PRICING_TIERS.TWO_K.threshold) {
      pricingTier = PRICING_TIERS.TWO_K;
    } else if (aggregatedResolution >= PRICING_TIERS.FULL_HD.threshold) {
      pricingTier = PRICING_TIERS.FULL_HD;
    }

    totalCost = (pricingTier.cost * totalMinutes) / 1000;
    responseObj = {
      ...responseObj,
      query_duration: `${((Date.now() - queryStartTime) / 1000).toFixed(2)}s`,
      total_queries: totalQueries,
      query_date: new Date().toISOString(),
      aggregated_resolution: aggregatedResolution,
      pricing_tier: pricingTier.label,
      total_cost: parseFloat(totalCost.toFixed(2)),
      disclaimer,
    };

    res.status(200).json(responseObj);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

async function exponentialBackoff(fn, maxRetries = 5, initialDelay = 1000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (error.response && error.response.status === 429) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries);
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
} 