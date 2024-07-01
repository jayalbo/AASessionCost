/*

  Agora Analytics Request frequency

  Starter  N/A
  Standard 1/second & 1,000/day
  Premium  3/second & 2,000/day
  Enterprise  10/second & 10,000/day

*/
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  let totalQueries = 0;
  let queryStartTime = Date.now();
  const { appId, callId, startTime, endTime } = req.query;
  let speaker = {
    uid: 0,
    sid: 0,
  };

  if (!appId || !callId || !startTime || !endTime) {
    return res.status(400).send("Missing query parameters");
  }

  const config = {
    baseURL: "https://api.agora.io/beta/analytics",
    headers: {
      Authorization: `Basic ${process.env.AUTH_TOKEN}`,
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
      if (user?.speaker) {
        speaker.uid = user.uid;
        speaker.sid = user.sid;
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

    const userMinutes = calculateUserMinutes(allCallInfo);
    const totalMinutes = Object.values(userMinutes).reduce(
      (sum, minutes) => sum + minutes,
      0,
    );

    responseObj = {
      call_id: callId,
      channel_name: allCallInfo[0].cname,
      total_users_in_call: allCallInfo.length,
      total_accumulated_minutes: Math.ceil(totalMinutes),
      speaker_uid: speaker.uid,
      speaker_sid: speaker.sid,
    };

    if (speaker.uid) {
      // Query speaker video resolution (if available)
      totalQueries++;
      const speakerResolution = await exponentialBackoff(() =>
        axios.get("/call/metrics", {
          ...config,
          params: {
            appid: appId,
            call_id: callId,
            start_ts: startTime,
            end_ts: endTime,
            sids: speaker.sid,
          },
        }),
      );
      // Get maximum video resolution
      const filteredData = speakerResolution.data.metrics[0].data.filter(
        (item) => item.mid === 20027 || item.mid === 20028,
      );
      let maxWidth = -Infinity;
      let maxHeight = -Infinity;

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
        // Determine the video type
        const aggregatedResolution = maxWidth * maxHeight;
        const pricingTier = process.env.COST_VIDEO_HD;
        const labelTier = process.env.LABEL_VIDEO_HD;
        if (aggregatedResolution >= process.env.THRESHOLD_VIDEO_2KPLUS) {
          labelTier = process.env.LABEL_VIDEO_2KPLUS;
          pricingTier = process.env.COST_VIDEO_2KPLUS;
        } else if (aggregatedResolution >= process.env.THRESHOLD_VIDEO_2K) {
          labelTier = process.env.LABEL_VIDEO_2K;
          pricingTier = process.env.COST_VIDEO_2K;
        } else if (
          aggregatedResolution >= process.env.THRESHOLD_VIDEO_FULL_HD
        ) {
          labelTier = process.env.LABEL_VIDEO_FULL_HD;
          pricingTier = process.env.COST_VIDEO_FULL_HD;
        }
        const cost = (pricingTier * totalMinutes) / 1000;
        responseObj = {
          ...responseObj,
          speaker_resolution: {
            width: maxWidth,
            height: maxHeight,
            aggregated_resolution: aggregatedResolution,
            tier: labelTier,
          },
          cost: parseFloat(`${cost.toFixed(2)}`),
          query_duration: `${((Date.now() - queryStartTime) / 1000).toFixed(2)}s`,
          total_queries: totalQueries,
          query_date: new Date().toISOString(),
        };
      }
    }
    res.send(responseObj).status(200);
  } catch (error) {
    res.send(`An error occurred: ${error.message}`).status(500);
  }
});
app.listen(port, () => {
  console.log(`Listening on ${port}`);
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
