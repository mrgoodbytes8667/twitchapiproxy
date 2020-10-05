var express = require('express');
var router = express.Router();
var config = require('./../utils/config');
const fetch = require('node-fetch');
var twitchToken = require('./../utils/twitchToken');


/**
 * Listen for plain helix endpoint GET methods
 */
router.get("/helix/*", (request, response) => {
    route(response, request.url, 'helix');
});

/**
 * Listen for plain kraken endpoint GET methods
 */
router.get("/kraken/*", (request, response) => {
    route(response, request.url, 'kraken');
});

/**
 * Listen for helix endpoint methods
 */
router.get("/:method/helix/*", (request, response) => {
    route(response, request.url, 'helix');
});

/**
 * Listen for kraken endpoint methods
 */
router.get("/:method/kraken/*", (request, response) => {
    route(response, request.url, 'kraken');
});

/**
 * Helix endpoint headers
 * @return {{Authorization: string, "Client-Id": (string)}}
 */
function helixHeaders() {
    return {
        'Authorization': 'Bearer ' + twitchToken.getToken(),
        'Client-Id': config.clientId
    };
}

/**
 * Kraken endpoint headers
 * @return {{Authorization: string, Accept: string, "Client-ID": string}}
 */
function krakenHeaders() {
    return {
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Authorization': 'OAuth ' + twitchToken.getToken(),
        'Client-ID': config.clientId
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



module.exports = router;
