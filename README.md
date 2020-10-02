Twitch API Proxy
--
A node/express "proxy" for Twitch API calls that will also handle Twitch OAuth.

## Setup
- Clone the repo
- Run `npm install` or `yarn install`
- Copy config.sample.json and name it config.json
- Populate config.json with your Twitch Client ID, Twitch Client Secret, and port.
- Add every [scope](https://dev.twitch.tv/docs/authentication#scopes) needed from Twitch space separated (ex. `user:read:email clips:edit`)  
  - **_You should only include scopes you actually need!_**  
  - You need a minimum of one scope
  - You can mix and match helix and kraken scopes
- Start the server via `npm start` or `yarn start`
- Navigate to the Twitch authentication URL: http://localhost:58667/auth/twitch (replace 58667 with the port specified in config.json)  
  Login to Twitch and click Authorize
- Take the resulting refresh token and add to config.json under `refreshToken` and restart the server

## Usage
Make a Twitch API call to the Kraken or Helix endpoints replacing `https://api.twitch.tv` with `http://localhost:58667`  (replace 58667 with the port specified in config.json). The server will proxy your requests through to Twitch adding the appropriate OAuth and client headers.
Does not support POST or any methods that require a body (Ex. [Helix Start Commercial](https://dev.twitch.tv/docs/api/reference#start-commercial)).

The server will get a new token for Twitch each time the service is started using the supplied refresh token. It will refresh again every three hours if left running.

## Examples
URL `http://localhost:58667/helix/users?id=44322889`  
Response
```
{
  "data": [{
    "id": "44322889",
    "login": "dallas",
    "display_name": "dallas",
    "type": "staff",
    "broadcaster_type": "",
    "description": "Just a gamer playing games and chatting. :)",
    "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
    "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
    "view_count": 191836881,
    "email": "login@provider.com"
  }]
}
```  
URL `http://localhost:58667/kraken/users/44322889`  
Response
```
{
    "display_name": "dallas",
    "_id": "44322889",
    "name": "dallas",
    "type": "user",
    "bio": "Friendly, interactive, and very bald.",
    "created_at": "2013-06-03T19:12:02.580593Z",
    "updated_at": "2020-10-01T10:49:27.019426Z",
    "logo": "https://static-cdn.jtvnw.net/jtv_user_pictures/4d1f36cbf1f0072d-profile_image-300x300.png"
}
```  