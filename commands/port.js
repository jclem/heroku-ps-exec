'use strict';

const child = require('child_process');
const path = require('path');
const cli = require('heroku-cli-util');
const https = require('https')
const http = require('http')
const fs = require('fs')
const co = require('co');
const socks = require('socksv5')
var net = require("net");
const helpers = require('../lib/helpers')

module.exports = {
  topic: 'tunnels',
  command: 'port',
  description: 'Launch a SOCKS proxy into a dyno',
  help: 'Usage: heroku tunnels:port PORT',
  args: [{name: 'port', optional: false}],
  flags: [{ name: 'dyno', char: 'd', hasValue: true }],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(run))
};

function * run(context, heroku) {
  let forwardPort = context.args.port;
  let configVars = yield heroku.get(`/apps/${context.app}/config-vars`)
  yield helpers.createSocksProxy(context, heroku, configVars, function(dynoIp, dynoName, socksPort) {
    cli.log(`Listening on localhost:${forwardPort} and forwarding to ${dynoName}:${forwardPort}...`)
    net.createServer(function(connIn) {
      socks.connect({
        host: '0.0.0.0',
        port: forwardPort,
        proxyHost: '127.0.0.1',
        proxyPort: socksPort,
        auths: [ socks.auth.None() ]
      }, function(socket) {
        connIn.pipe(socket);
        socket.pipe(connIn);
      });
    }).listen('8080');
  });
}
