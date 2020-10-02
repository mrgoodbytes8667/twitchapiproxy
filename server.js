/**
 * Get config values from config.json
 */
let {clientId, clientSecret, refreshToken, port, scopes} = require('./config.json');

/**
 * Build yargs command line argument settings
 * @type {Object | {port: ?number, clientId: ?string, clientSecret: ?string, scopes: ?string[], refreshToken: ?string}}
 */
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
        if (argv.port <= 1023 || argv.port > 65535) {
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
if (argv.clientId) {
    clientId = argv.clientId;
}
if (argv.clientSecret) {
    clientSecret = argv.clientSecret;
}
if (argv.scopes && argv.scopes.length > 0) {
    scopes = argv.scopes.join(' ');
}
if (argv.refreshToken) {
    refreshToken = argv.refreshToken;
}

/**
 * Listen for plain helix endpoint GET methods
 */
app.get("/helix/*", (request, response) => {
    route(response, request.url, 'helix');
});

/**
 * Listen for plain kraken endpoint GET methods
 */
app.get("/kraken/*", (request, response) => {
    route(response, request.url, 'kraken');
});

/**
 * Listen for helix endpoint methods
 */
app.get("/:method/helix/*", (request, response) => {
    route(response, request.url, 'helix');
});

/**
 * Listen for kraken endpoint methods
 */
app.get("/:method/kraken/*", (request, response) => {
    route(response, request.url, 'kraken');
});

/**
 * Listen for the Twitch OAuth call
 */
app.get("/auth/twitch", (request, response) => {
    let url = new URL('https://id.twitch.tv/oauth2/authorize');
    const params = new URLSearchParams({
        'client_id': clientId,
        'redirect_uri': callback,
        'response_type': 'code',
        'scope': scopes,
        'state': state,
    });
    url.search = params.toString();
    response.redirect(url.toString());
});

/**
 * Listen for the Twitch OAuth callback
 */
app.get("/auth/twitch/callback", (request, response) => {
    if (request.query.state !== state) {
        response.status(400);
        response.json({'error': 'Invalid state'});
    } else {
        let url = new URL('https://id.twitch.tv/oauth2/token');
        const params = new URLSearchParams({
            'client_id': clientId,
            'client_secret': clientSecret,
            'code': request.query.code,
            'grant_type': 'authorization_code',
            'redirect_uri': callback
        });
        url.search = params.toString();
        fetch(url.toString(), {
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
                    '    <p>Copy the code "<code>' + res.refresh_token + '</code>" into the file <var>config.json</var> in the <code>refreshToken</code> field and restart this service.</p>\n' +
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
    callback = 'http://localhost:' + listener.address().port + '/auth/twitch/callback';
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
    let url = new URL('https://id.twitch.tv/oauth2/token');
    const params = new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken,
        'client_id': clientId,
        'client_secret': clientSecret
    });
    url.search = params.toString();
    return fetch(url.toString(), {
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

/**
 * Helix endpoint headers
 * @return {{Authorization: string, "Client-Id": (string)}}
 */
function helixHeaders() {
    return {
        'Authorization': 'Bearer ' + token,
        'Client-Id': clientId
    };
}

/**
 * Kraken endpoint headers
 * @return {{Authorization: string, Accept: string, "Client-ID": string}}
 */
function krakenHeaders() {
    return {
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Authorization': 'OAuth ' + token,
        'Client-ID': clientId
    };
}

/**
 *
 * @param {Response} response
 * @param {string} url
 * @param {string} api helix or kraken
 */
function route(response, url, api) {
    const parsed = parseEndpoint(url);
    let status = 200;
    let headers = helixHeaders();
    if (api === 'kraken') {
        headers = krakenHeaders();
    }
    let opts = {
        headers: headers,
        method: parsed.method
    };
    if (parsed.body !== '' && parsed.method !== 'GET') {
        opts['body'] = parsed.body;
        opts['headers']['Content-Type'] = 'application/json';
    }
    console.log(opts);
    fetch('https://api.twitch.tv' + parsed.endpoint, opts)
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
}

/**
 *
 * @param {string} endpoint
 * @return {{endpoint: string, method: string, body: string}}
 */
function parseEndpoint(endpoint) {
    const url = new URL(endpoint, 'http://localhost');
    let parts = url.pathname.split('/');
    parts.shift();
    let method = 'GET';
    switch (parts[0]) {
        case 'helix':
        case 'kraken':
            break;
        default:
            method = parts.shift().toUpperCase();
            break;
    }

    const test = url.search;
    const regex = RegExp('body-*');
    let params = new URLSearchParams();
    let body = {};
    let hasBody = false;
    if (regex.test(test)) {
        url.searchParams.forEach(function (value, key) {
            if (key.startsWith('body-')) {
                body[key.slice(5)] = value;
                hasBody = true;
            } else {
                params.append(key, value);
            }
        });
    } else {
        params = url.searchParams;
    }

    if (hasBody === true) {
        body = JSON.stringify(body);
    } else {
        body = '';
    }

    let r = '/' + parts.join('/');
    const queryString = params.toString();
    if (queryString !== '') {
        r += '?' + queryString;
    }

    return {
        'method': method,
        'endpoint': r,
        'body': body
    };
}