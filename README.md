Twitch API Proxy
----------------
![Release](https://github.com/mrgoodbytes8667/twitchapiproxy/workflows/Release/badge.svg)

A node/express "proxy" for Twitch API calls that will also handle Twitch OAuth.  

## Setup
- Before you begin, this assumes you have Node v10 or higher along with npm or yarn.
- Clone the repo or download from the releases page.
- Run `npm install` or `yarn install`
- Copy `config.sample.json` and name it `config.json`
- Populate config.json with your Twitch Client ID, Twitch Client Secret, and port.  
  **Note**: The port defaults to `58667` and is referenced as such throughout this document. If you change the port, the number will need to be changed in all examples.
  - You need to register a Twitch application via the [Twitch Developer Console](https://dev.twitch.tv/console).
  - Add a OAuth Redirect URL of `http://localhost:58667/auth/twitch/callback`
- Add every [scope](https://dev.twitch.tv/docs/authentication#scopes) needed from Twitch space separated (ex. `user:read:email clips:edit`)  
  - **_You should only include scopes you actually need!_**  
  - You need a minimum of one scope
  - You can mix and match helix and kraken scopes
- Start the server via `npm start` or `yarn start`
- Navigate to the Twitch authentication URL: http://localhost:58667/auth/twitch  
  Login to Twitch and click Authorize
- Take the resulting refresh token and add to config.json under `refreshToken` and restart the server

## Usage
Make a Twitch API call to the Kraken or Helix endpoints replacing `https://api.twitch.tv` with `http://localhost:58667` for most calls (see below). The server will proxy your requests through to Twitch adding the appropriate OAuth and client headers.

The server will get a new token for Twitch each time the service is started using the supplied refresh token. It will refresh again every three hours if left running.

### GET
Any method that uses GET can simply have the domain replaced with no special actions needed. For consistency, you can also prepend with `get`.

#### Example
[Get Top Game(s)](https://dev.twitch.tv/docs/api/reference#get-top-games)  
`http://localhost:58667/get/helix/games/top` or `http://localhost:58667/helix/games/top`

### POST, PUT
Any method that uses POST or PUT must also be prepended with post or put, ie: `http://localhost:58667/post/` or `http://localhost:58667/put/`.
In addition, any body parameters need to be appended as query parameters where each parameter is prepended with `body-`.

#### Example
[Check Automod Status](https://dev.twitch.tv/docs/api/reference#check-automod-status) has both query and body parameters.  
Query: broadcaster_id  
Body: msg_id, msg_text, user_id  
`http://localhost:58667/post/helix/moderation/enforcements/status?broadcaster_id=123&body-msg_id=abc&body-msg_text=def&body-user_id=789`

### PATCH, DELETE
Any method that uses PATCH or DELETE must also be prepended with patch or delete, ie: `http://localhost:58667/patch/` or `http://localhost:58667/delete/`.

#### Example
[Modify Channel Information](https://dev.twitch.tv/docs/api/reference#modify-channel-information)  
`http://localhost:58667/patch/helix/channels?broadcaster_id=123&game_id=456`

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