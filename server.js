let {clientId, clientSecret, refreshToken, port, scopes} = require('./config.json');
const argv = require('yargs')
    .option('port', {
        type: 'number',
        description: 'The port to run on'
    })
    .option('clientId', {
        type: 'string',
        description: 'Twitch Client ID'
    })
    .option('clientSecret', {
        type: 'string',
        description: 'Twitch Client Secret'
    })
    .option('scopes', {
        array: true,
        description: 'All scopes necessary for creating the Twitch OAuth token'
    })
    .option('refreshToken', {
        type: 'string',
        description: 'Twitch Refresh Token'
    }).check((argv) => {
        if(argv.port <= 1023 || argv.port > 65535) {
            throw new Error('Port is not valid');
        }
        return true;
    })
    .argv;

const express = require("express");
const app = express();
const fetch = require('node-fetch');
const cryptoRandomString = require('crypto-random-string');

/**
 * Callback URL (populated by listener)
 * @type {string}
 */
let callback = '';
/**
 * Twitch access token
 * @type {string}
 */
let token;
/**
 * State variable to prevent forgeries
 * @type {string | *}
 */
const state = cryptoRandomString({length: 30, type: 'url-safe'});

// Replace our config.json values with any command line arguments
if (argv.port) {
    port = argv.port;
}
if(argv.clientId) {
    clientId = argv.clientId;
}
if(argv.clientSecret) {
    clientSecret = argv.clientSecret;
}
if(argv.scopes && argv.scopes.length > 0) {
    scopes = argv.scopes.join(' ');
}
if(argv.refreshToken) {
    refreshToken = argv.refreshToken;
}

/**
 * Listen for helix endpoint GET methods
 */
app.get("/helix/*", (request, response) => {
    let status = 200;
    fetch('https://api.twitch.tv' + request.url, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Client-Id': clientId
        }
    })
        .then(res => {
            status = res.status;
            return res.json();
        })
        .then(res => {
            response.status(status);
            response.json(res);
        })
        .catch(err => {
            console.error(err);
            response.json(err);
        });
});

/**
 * Listen for kraken endpoint GET methods
 */
app.get("/kraken/*", (request, response) => {
    let status = 200;
    fetch('https://api.twitch.tv' + request.url, {
        headers: {
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Authorization': 'OAuth ' + token,
            'Client-ID': clientId
        }
    })
        .then(res => {
            status = res.status;
            return res.json();
        })
        .then(res => {
            response.status(status);
            response.json(res);
        })
        .catch(err => {
            console.error(err);
            response.json(err);
        });
});

/**
 * Listen for the Twitch OAuth call
 */
app.get("/auth/twitch", (request, response) => {
    response.redirect('https://id.twitch.tv/oauth2/authorize?client_id=' + clientId +
        '&redirect_uri=' + callback + '&state=' + state +
        '&response_type=' + scopes);
});

/**
 * Listen for the Twitch OAuth callback
 */
app.get("/auth/twitch/callback", (request, response) => {
    if (request.query.state !== state) {
        response.status(400);
        response.json({'error': 'Invalid state'});
    } else {

        fetch('https://id.twitch.tv/oauth2/token?client_id=' + clientId +
            '&client_secret=' + clientSecret + '&code=' + request.query.code + '&grant_type=authorization_code&redirect_uri=' + callback, {
            method: 'POST'
        })
            .then(res => res.json())
            .then(res => {
                token = res.access_token;
                response.send('<!doctype html>\n' +
                    '<html lang="en">\n' +
                    '  <head>\n' +
                    '    <!-- Required meta tags -->\n' +
                    '    <meta charset="utf-8">\n' +
                    '    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">\n' +
                    '\n' +
                    '    <!-- Bootstrap CSS -->\n' +
                    '    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" integrity="sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z" crossorigin="anonymous">\n' +
                    '\n' +
                    '    <title>Twitch API Proxy!</title>\n' +
                    '  </head>\n' +
                    '  <body>\n' +
                    '    <br>\n' +
                    '    <main role="main" class="container">\n' +
                    '  <div class="jumbotron">\n' +
                    '    <h1>Success!</h1>\n' +
                    '    <p>Copy the code <code>' + res.refresh_token + '</code> into the file <var>config.json</var> in the <code>refreshToken</code> field and restart this service.</p>\n' +
                    '  </div>\n' +
                    '  <div>\n' +
                    '    <p>Full response:</p>\n' +
                    '    <pre><code>' +
                        JSON.stringify(res)
                            .replace(/,/g, ",\n")
                            .replace('{', '{\n')
                            .replace('}', '\n}')
                            .replace('[', '[\n')
                            .replace(']', '\n]') +
                    '</code></pre>\n' +
                    '  </div>\n' +
                    '</main>\n' +
                    '\n' +
                    '    <!-- Optional JavaScript -->\n' +
                    '    <!-- jQuery first, then Popper.js, then Bootstrap JS -->\n' +
                    '    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>\n' +
                    '    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js" integrity="sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN" crossorigin="anonymous"></script>\n' +
                    '    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" integrity="sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV" crossorigin="anonymous"></script>\n' +
                    '  </body>\n' +
                    '</html>');
            })
            .catch(err => {
                console.error(err);
                response.json(err);
            });
    }
});

// listen for requests :)
const listener = app.listen(port, () => {
    console.log("Your app is listening on port " + listener.address().port);
    callback = encodeURIComponent('http://localhost:' + listener.address().port + '/auth/twitch/callback');
    if (refreshToken !== '') {
        doTokenRefresh();
        setInterval(doTokenRefresh, 3 * 3600 * 1000);
    }
});

/**
 * Refresh our Twitch access token
 * @return {Promise<* | string>}
 */
async function doTokenRefresh() {
    return fetch('https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=' + refreshToken +
        '&client_id=' + clientId + '&client_secret=' + clientSecret, {
        method: 'POST'
    })
        .then(res => res.json())
        .then(res => {
            token = res.access_token;
            return token;
        })
        .catch(err => {
            return JSON.stringify(err);
        });
}