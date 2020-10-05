const cryptoRandomString = require('crypto-random-string');

/**
 * Get config values from config.json
 */
let {clientId, clientSecret, refreshToken, port, scopes} = require('./../config.json');

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

module.exports = {
    port: port,
    clientId: clientId,
    clientSecret: clientSecret,
    scopes: scopes,
    refreshToken: refreshToken,
    /**
     * State variable to prevent forgeries
     * @type {string | *}
     */
    state: cryptoRandomString({length: 30, type: 'url-safe'})
};