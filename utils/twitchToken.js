const config = require('./../utils/config');
const fetch = require('node-fetch');

/**
 * Twitch access token
 * @type {string}
 */
let token = '';

module.exports = {

    /**
     * Twitch access token
     * @type {string}
     */
    getToken() {
        return token;
    },

    /**
     * Refresh our Twitch access token
     * Will take the expiry field returned, multiply it by 0.8 to give some leeway, and schedule this to rerun in that
     * number of seconds.
     * @return {Promise<* | string>}
     */
    async doTokenRefresh() {
        let url = new URL('https://id.twitch.tv/oauth2/token');
        const params = new URLSearchParams({
            'grant_type': 'refresh_token',
            'refresh_token': config.refreshToken,
            'client_id': config.clientId,
            'client_secret': config.clientSecret
        });
        url.search = params.toString();
        return fetch(url.toString(), {
            method: 'POST'
        })
            .then(res => res.json())
            .then(res => {
                token = res.access_token;
                let expiry = res.expires_in;
                let refreshIn = Math.round(expiry * 0.8);
                let refreshInFormatted = new Date(refreshIn * 1000).toISOString().substr(11, 8);
                console.log(`Next token refresh occurs in ${refreshInFormatted}.`);
                refreshIn *= 1000;
                setTimeout(this.doTokenRefresh, refreshIn);
                return token;
            })
            .catch(err => {
                return JSON.stringify(err);
            });
    }
}