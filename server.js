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
    response.send('<!doctype html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '    <!-- Required meta tags -->\n' +
        '    <meta charset="utf-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">\n' +
        '\n' +
        '    <!-- Bootstrap CSS -->\n' +
        '    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"\n' +
        '          integrity="sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z" crossorigin="anonymous">\n' +
        '\n' +
        '    <title>Twitch API Proxy</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<main role="main" class="container">\n' +
        '    <h1>OAuth</h1>\n' +
        '    <form>\n' +
        '        <h3>Application Info</h3>\n' +
        '        <div class="form-row">\n' +
        '            <div class="form-group col-md-6">\n' +
        '                <label for="client-id">Client ID</label>\n' +
        '                <input type="text" id="client-id" class="form-control" value="' + clientId + '" disabled>\n' +
        '            </div>\n' +
        '            <div class="form-group col-md-6">\n' +
        '                <label for="redirect">Redirect</label>\n' +
        '                <input type="url" id="redirect" class="form-control" value="' + callback + '"\n' +
        '                       disabled>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '        <div class="form-row">\n' +
        '            <div class="form-group col-md-6">\n' +
        '                <label for="client-secret">Client Secret</label>\n' +
        '                <input type="password" id="client-secret" class="form-control" value="' + clientSecret + '" disabled\n' +
        '                       aria-describedby="clientSecretHelpBlock">\n' +
        '                <small id="clientSecretHelpBlock" class="form-text text-muted">\n' +
        '                    You must keep this confidential.\n' +
        '                </small>\n' +
        '            </div>\n' +
        '            <div class="form-group col-md-6">\n' +
        '                <label for="state">State</label>\n' +
        '                <input type="text" id="state" class="form-control" value="' + state + '" disabled\n' +
        '                       aria-describedby="stateHelpBlock">\n' +
        '                <small id="stateHelpBlock" class="form-text text-muted">\n' +
        '                    A randomly generated value that will be passed through to Twitch. It will be verified when Twitch\n' +
        '                    returns control to us to ensure you haven not been hijacked.\n' +
        '                </small>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '        <h3>Scopes</h3>\n' +
        '        <p class="lead">Applications should request the appropriate scopes for the intended target API only. Failure to adhere to these guidelines may result in the suspension of your application’s access to the Twitch API. (per <a href="https://dev.twitch.tv/docs/authentication/#registration">Twitch API Documentation</a>)</p>\n' +
        '        <div class="form-group">\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="analytics-read-extensions">\n' +
        '                <label class="form-check-label row" for="analytics-read-extensions">\n' +
        '                    <div class="col-sm-3"><code>analytics:read:extensions</code></div>\n' +
        '                    <div class="col-sm-9">View analytics data for your extensions.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="analytics-read-games">\n' +
        '                <label class="form-check-label row" for="analytics-read-games">\n' +
        '                    <div class="col-sm-3"><code>analytics:read:games</code></div>\n' +
        '                    <div class="col-sm-9">View analytics data for your games.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="bits-read">\n' +
        '                <label class="form-check-label row" for="bits-read">\n' +
        '                    <div class="col-sm-3"><code>bits:read</code></div>\n' +
        '                    <div class="col-sm-9">View Bits information for your channel.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="channel-edit-commercial">\n' +
        '                <label class="form-check-label row" for="channel-edit-commercial">\n' +
        '                    <div class="col-sm-3"><code>channel:edit:commercial</code></div>\n' +
        '                    <div class="col-sm-9">Run commercials on a channel.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="channel-manage-broadcast">\n' +
        '                <label class="form-check-label row" for="channel-manage-broadcast">\n' +
        '                    <div class="col-sm-3"><code>channel:manage:broadcast</code></div>\n' +
        '                    <div class="col-sm-9">\n' +
        '                        Manage your channel’s broadcast configuration, including updating channel configuration and\n' +
        '                        managing stream markers and stream tags.\n' +
        '                    </div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="channel-manage-extension">\n' +
        '                <label class="form-check-label row" for="channel-manage-extension">\n' +
        '                    <div class="col-sm-3"><code>channel:manage:extension</code></div>\n' +
        '                    <div class="col-sm-9">\n' +
        '                        Manage your channel’s extension configuration, including activating extensions.\n' +
        '                    </div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="channel-read-hype_train">\n' +
        '                <label class="form-check-label row" for="channel-read-hype_train">\n' +
        '                    <div class="col-sm-3"><code>channel:read:hype_train</code></div>\n' +
        '                    <div class="col-sm-9">Gets the most recent hype train on a channel.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="channel-read-stream_key">\n' +
        '                <label class="form-check-label row" for="channel-read-stream_key">\n' +
        '                    <div class="col-sm-3"><code>channel:read:stream_key</code></div>\n' +
        '                    <div class="col-sm-9">Read an authorized user’s stream key.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="channel-read-subscriptions">\n' +
        '                <label class="form-check-label row" for="channel-read-subscriptions">\n' +
        '                    <div class="col-sm-3"><code>channel:read:subscriptions</code></div>\n' +
        '                    <div class="col-sm-9">\n' +
        '                        Get a list of all subscribers to your channel and check if a user is subscribed to your channel\n' +
        '                    </div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="clips-edit">\n' +
        '                <label class="form-check-label row" for="clips-edit">\n' +
        '                    <div class="col-sm-3"><code>clips:edit</code></div>\n' +
        '                    <div class="col-sm-9">Manage a clip object.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="user-edit">\n' +
        '                <label class="form-check-label row" for="user-edit">\n' +
        '                    <div class="col-sm-3"><code>user:edit</code></div>\n' +
        '                    <div class="col-sm-9">Manage a user object.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="user-edit-follows">\n' +
        '                <label class="form-check-label row" for="user-edit-follows">\n' +
        '                    <div class="col-sm-3"><code>user:edit:follows</code></div>\n' +
        '                    <div class="col-sm-9">Edit your follows.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="user-read-broadcast">\n' +
        '                <label class="form-check-label row" for="user-read-broadcast">\n' +
        '                    <div class="col-sm-3"><code>user:read:broadcast</code></div>\n' +
        '                    <div class="col-sm-9">\n' +
        '                        View your broadcasting configuration, including extension configurations.\n' +
        '                    </div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '            <div class="form-check">\n' +
        '                <input class="form-check-input" type="checkbox" value="" id="user-read-email">\n' +
        '                <label class="form-check-label row" for="user-read-email">\n' +
        '                    <div class="col-sm-3"><code>user:read:email</code></div>\n' +
        '                    <div class="col-sm-9">Read an authorized user’s email address.</div>\n' +
        '                </label>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </form>\n' +
        '    <a class="btn btn-primary" href="#" role="button" id="continue">Continue</a>\n' +
        '    <hr>\n' +
        '    <h3>Extra</h3>\n' +
        '    <div>\n' +
        '        <p>To use the scopes checked above by default going forward, paste the following into <code>scopes</code> inside\n' +
        '            <code>config.json</code></p>\n' +
        '        <kbd id="scopes"></kbd>\n' +
        '    </div>\n' +
        '</main>\n' +
        '\n' +
        '<!-- Optional JavaScript -->\n' +
        '<!-- jQuery first, then Popper.js, then Bootstrap JS -->\n' +
        '<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"\n' +
        '        integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj"\n' +
        '        crossorigin="anonymous"></script>\n' +
        '<script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"\n' +
        '        integrity="sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN"\n' +
        '        crossorigin="anonymous"></script>\n' +
        '<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"\n' +
        '        integrity="sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV"\n' +
        '        crossorigin="anonymous"></script>\n' +
        '\n' +
        '<script type="text/javascript">\n' +
        '    $(function () {\n' +
        '        var scopes = "' + scopes + '";\n' +
        '        scopes = scopes.replace(/:/g, "-");\n' +
        '        scopes = scopes.split(" ");\n' +
        '        scopes.forEach(value => {\n' +
        '            $("#" + value).prop("checked", true);\n' +
        '        });\n' +
        '\n' +
        '        $("input:checkbox").change(\n' +
        '            function () {\n' +
        '                checkboxes();\n' +
        '            });\n' +
        '\n' +
        '        checkboxes();\n' +
        '\n' +
        '    });\n' +
        '\n' +
        '    function checkboxes() {\n' +
        '        scopes = "";\n' +
        '        $("input:checkbox").each(function () {\n' +
        '            if ($(this).is(":checked")) {\n' +
        '                scopes += " " + $(this).attr("id");\n' +
        '            }\n' +
        '        });\n' +
        '        scopes = scopes.replace(/\-/g, ":").trim();\n' +
        '        $("#scopes").text(scopes);\n' +
        '        let url = new URL("https://id.twitch.tv/oauth2/authorize");\n' +
        '        const params = new URLSearchParams({\n' +
        '            "client_id": "' + clientId + '",\n' +
        '            "redirect_uri": "' + callback + '",\n' +
        '            "response_type": "code",\n' +
        '            "scope": scopes,\n' +
        '            "state": "' + state + '",\n' +
        '        });\n' +
        '        url.search = params.toString();\n' +
        '\n' +
        '        $("#continue").attr("href", url.toString());\n' +
        '    }\n' +
        '</script>\n' +
        '</body>\n' +
        '</html>');
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