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
http://localhost:8888/?appId=123&callId=456&startTime=1617222000&endTime=1617225600
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
