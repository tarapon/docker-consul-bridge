#! /usr/local/bin/node
const _ = require('lodash')
const Consul = require('consul-node')
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

const docker = new Docker({socketPath: '/var/run/docker.sock'})

docker.container.list({status: ['running']})
  .then(containers => {
    containers.forEach(c => {
      c.status()
        .then(containerToService)
        .then(console.log)
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
    address: networks.map(([name,network]) => { return {name, ip: network.IPAddress}}),
    ports: _.keys(c.data.NetworkSettings.Ports)
  }
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
          .then(console.log)
          .catch()
      }
    })
  })







