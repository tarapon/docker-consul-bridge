#! /usr/local/bin/node
const _ = require('lodash')
const Docker = require('node-docker-api').Docker
const ConsulProvider = require('./providers/consul')
const Registrator = require('./registrator')
const EventsListener = require('./events-listener')

const argv = require('yargs')
  .option('socket', {describe: 'path to docker socket'})
  .option('consul', {describe: 'consul url'})
  .option('resync', {describe: 'resync interval (seconds), 0 - never'})
  .demandOption(['socket', 'consul'])
  .help()
  .argv

let docker = new Docker({socketPath: argv.socket})
let provider = new ConsulProvider(argv.consul)
let registrator = new Registrator(provider)
let eventsListener = new EventsListener()

eventsListener.on('start', event => {
  let c = docker.container.get(event.id)
  registrator.addService(c)
})

eventsListener.on('die', event => {
  registrator.removeService(event.id)
})

docker.events()
  .then(stream => {
    eventsListener.listen(stream)
  })
  .catch(e => {
    console.error(e)
    process.exit(1)
  })

const resync = () => {
  docker.container.list({status: ['running']})
    .then(containers => {
      registrator.resyncServices(containers)
    })
    .catch(e => {
      console.error(e)
    })
}

resync()

if (argv.resync) {
  setInterval(resync, argv.resync * 1000)
}

process.stdin.resume()
process.on('SIGINT', () => {
  console.log('exiting...')
  process.exit()
})
