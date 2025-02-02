'use strict'

const child = require('child_process')
const cli = require('heroku-cli-util')
const exec = require('heroku-exec-util')
const co = require('co')
const Client = require('ssh2').Client
const https = require('https')
const url = require('url')
const tty = require('tty')
const stream = require('stream')

module.exports = function (topic, command) {
  return {
    topic: topic,
    command: command,
    description: 'Create an SSH session to a dyno',
    help: `Example:

    $ heroku ps:exec 'node -i' --app murmuring-headland-14719`,
    variableArgs: true,
    flags: [
      { name: 'dyno', char: 'd', hasValue: true, description: 'specify the dyno to connect to' },
      { name: 'ssh', hasValue: false, description: 'use native ssh' },
      { name: 'status', hasValue: false, description: 'lists the status of the SSH server in the dyno' }],
    needsApp: true,
    needsAuth: true,
    run: cli.command(co.wrap(run))
  }
}

function * run (context, heroku) {
  yield exec.initFeature(context, heroku, function *(configVars) {
    if (context.flags.status) {
      yield exec.checkStatus(context, heroku, configVars)
    } else {
      yield exec.updateClientKey(context, heroku, configVars, function (privateKey, dyno, response) {
        var message = `Connecting to ${cli.color.cyan.bold(dyno)} on ${cli.color.app(context.app)}`
        cli.action(message, {success: false}, co(function* () {
          cli.hush(response.body)
          var json = JSON.parse(response.body)
          if (context.flags.ssh) {
            exec.ssh(context, json['client_user'], json['tunnel_host'], privateKey)
          } else {
            exec.connect(context, json['tunnel_host'], json['client_user'], privateKey)
          }
        }))
      })
    }
  })
  return new Promise(resolve => {})
}
