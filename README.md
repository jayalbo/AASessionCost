# AA Session Cost Calculator

A web application to calculate session costs for AA meetings. This tool helps track and analyze the costs associated with AA sessions, including speaker identification and duration.

## Features

- Dark mode support with persistent theme preference
- Customer authentication
- Session cost calculation
- Speaker identification and tracking
- Multi-host support
- Responsive design
- Date and time picker integration

## Usage

1. Enter your Customer ID and Secret
2. Provide the App ID and Call ID
3. Select the start and end times
4. Toggle Multi Host if needed
5. Click "Calculate Cost" to see the results

## Development

This is a standalone web application that can be deployed to GitHub Pages. The application uses:

- HTML5
- CSS3 (with Tailwind CSS)
- JavaScript (ES6+)
- Flatpickr for date/time picking

## Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions. Any push to the main branch will trigger a new deployment.

## API Integration

To integrate with the actual API:

1. Update the API endpoint in the JavaScript code
2. Ensure CORS is properly configured
3. Update the authentication headers as needed

## License

MIT License - feel free to use this code for your own projects.

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
CUSTOMER_ID=Agora Customer ID
CUSTOMER_SECRET=Agora Customer Secret
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
