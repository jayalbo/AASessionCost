# AASessionCost

```
$ npm i
$ npm run start
```
queryString parameters (required):
- appId: string
- callId: string
- startTime: int
- endTime: int
- multiHost: boolean (optional)


E.g.:
```
http://localhost:8888/?appId=123&callId=456&startTime=1617222000&endTime=1617225600&multiHost=true
```

Sample response:
```
{
  call_id: "668437fd9ad0a27cf*******",
  channel_name: "test",
  total_users_in_call: 29,
  total_accumulated_minutes: 81,
  speakers: [
    {
      uid: 2034*******,
      sid: "B59F4DC76A3643B8D01ADA4*******",
      speaker_resolution: {
        width: 1920,
        height: 1080
      }
    },
    {
      uid: 4150*******,
      sid: "CE48B8EBDFDB2051645EB31*******",
      speaker_resolution: {
        width: 640,
        height: 480
      }
    }
  ],
  query_duration: "0.80s",
  total_queries: 2,
  query_date: "2024-07-02T18:09:41.901Z",
  aggregated_resolution: 2380800,
  pricing_tier: "2K Video",
  total_cost: 1.29,
  disclaimer: "This estimate is based on audience session duration (not subscription). Actual costs may vary based on usage."
}
```


Environment variables:

```
AUTH_TOKEN=AGORA_BASIC_AUTH_TOKEN
LABEL_VIDEO_HD=HD Video
COST_VIDEO_HD=3.99
THRESHOLD_VIDEO_HD=0
LABEL_VIDEO_FULL_HD=Full HD Video
COST_VIDEO_FULL_HD=8.99
THRESHOLD_VIDEO_FULL_HD=921600
LABEL_VIDEO_2K=2K Video
COST_VIDEO_2K=15.99
THRESHOLD_VIDEO_2K=2073600
LABEL_VIDEO_2KPLUS=2K+ Video
COST_VIDEO_2KPLUS=35.99
THRESHOLD_VIDEO_2KPLUS=3686400
PORT=8888
```
