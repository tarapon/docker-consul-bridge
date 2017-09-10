#! /usr/local/bin/node
const _ = require('lodash')
const Consul = require('consul')
const Docker = require('node-docker-api').Docker
const StreamSplitter = require('stream-split')

const argv = require('yargs')
  .option('socket', {describe: 'path to docker socket'})
  .option('consul', {describe: 'consul url'})
  .option('networks', {describe: 'docker networks to monitor'})
  .array('networks')
  .demandOption(['socket', 'consul'])
  .help()
  .argv

const docker = new Docker({socketPath: argv.socket})
const consul = new Consul({baseUrl: argv.consul, promisify: true})

docker.container.list({status: ['running']})
  .then(containers => {
    containers.forEach(c => {
      c.status()
        .then(containerToService)
        .then(registerService)
    })
  })

const extractServiceName = (envs) => {
  let key = 'SERVICE_NAME='
  for (let env of envs) {
    if (env.startsWith(key)) {
      return env.substring(key.length)
    }
  }
}

const containerToService = (c) => {
  let networks = _.toPairs(c.data.NetworkSettings.Networks)
  return {
    id: c.id,
    name: extractServiceName(c.data.Config.Env),
    networks: networks.map(([name,network]) => { return {name, ip: network.IPAddress}}),
    ports: _.keys(c.data.NetworkSettings.Ports)
  }
}

const registerService = (service) => {
  if (!service.name) return

  consul.agent.service.register({
    id: service.id,
    name: service.name,
    address: service.networks[0].ip,
    port: parseInt(service.ports[0])
  })
  .then(res => console.log('Registered: ', service.name))
  .catch(console.error)
}

const deregisterService = (id) => {
  consul.agent.service.deregister(id)
    .then(res => console.log('Deregistered: ', id))
    .catch(console.error)
}

docker.events()
  .then(stream => {
    let splitter = new StreamSplitter(new Buffer("\n"))
    stream.pipe(splitter).on('data', data => {
      let event = JSON.parse(data)
      if (event.status === 'start') {
        docker.container.get(event.id)
          .status()
          .then(containerToService)
          .then(registerService)
          .catch()
      }

      if (event.status === 'die') {
        deregisterService(event.id)
      }
    })
  })







