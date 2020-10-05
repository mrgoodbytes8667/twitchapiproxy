var express = require('express');
var router = express.Router();
var config = require('./../utils/config');
const fetch = require('node-fetch');

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.render('setup-auth', {
        title: 'Twitch API Proxy',
        clientId: config.clientId,
        callbackUrl: 'http://localhost:' + config.port + '/setup/auth/callback',
        clientSecret: config.clientSecret,
        state: config.state,
        scopes: config.scopes
    });
});

router.get('/auth/callback', (request, response) => {
    if (request.query.state !== config.state) {
        response.status(400);
        response.json({'error': 'Invalid state'});
    } else {
        let url = new URL('https://id.twitch.tv/oauth2/token');
        const params = new URLSearchParams({
            'client_id': config.clientId,
            'client_secret': config.clientSecret,
            'code': request.query.code,
            'grant_type': 'authorization_code',
            'redirect_uri': 'http://localhost:' + config.port + '/setup/auth/callback'
        });
        url.search = params.toString();
        fetch(url.toString(), {
            method: 'POST'
        })
            .then(res => res.json())
            .then(res => {
                token = res.access_token;
                const hljs = require("highlight.js/lib/core");  // require only the core library
                // separately require languages
                hljs.registerLanguage('json', require('highlight.js/lib/languages/json'));

                response.render('setup-callback', {
                    title: 'Twitch API Proxy',
                    refreshToken: res.refresh_token,
                    resStringified: hljs.highlight('json', JSON.stringify(res, null, 4)).value
                });

            })
            .catch(err => {
                console.error(err);
                response.json(err);
            });
    }
});

module.exports = router;