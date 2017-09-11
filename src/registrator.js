const _ = require('lodash')
const parseEnv = require('./utils/env-parser')

class Registrator {
  constructor (provider, networks) {
    this.provider = provider
    this.networks = networks
    this.queue = []
  }

  addService (container) {
    this.queue.push(['add', container])
    this.processQueueLater()
  }

  removeService (id) {
    this.queue.push(['remove', id])
    this.processQueueLater()
  }

  async resyncServices (containers) {
    try {
      let existingServices = await this.provider.listServices()
      existingServices.forEach(s => {
        if (!_.some(containers, c => c.id === s.id)) {
          this.queue.push(['remove', s.id])
        }
      })
      containers.forEach(c => this.queue.push(['add', c]))
      this.processQueueLater()
    } catch (e) {
      console.log(e)
    }
  }

  processQueueLater () {
    if (this.queue.length > 0) {
      setTimeout(this.processQueue.bind(this), 0)
    }
  }

  async processQueue () {
    let [task, payload] = this.queue.shift()

    try {
      if (task === 'add') {
        let container = await payload.status()
        let service = this.mapToService(container)
        if (service) {
          console.log('Register service', service)
          await this.provider.addService(service)
        }
      }

      if (task === 'remove') {
        console.log('Remove service', payload)
        await this.provider.removeService(payload)
      }

    } catch (e) {
      console.error(e)
    }

    this.processQueueLater()
  }

  mapToService (container) {
    let options = this.getOptions(container.data.Config.Env)

    let name = options.name
    let network = options.network
      ? container.data.NetworkSettings.Networks[options.network]
      : _(container.data.NetworkSettings.Networks).values().first()

    let allPorts = _.keys(container.data.NetworkSettings.Ports).map(parseInt)
    let port = parseInt(options.port) || _.first(allPorts)

    if (name && network && port) {
      return {
        id: container.id,
        address: network.IPAddress,
        name,
        port
      }
    }

    console.log(`Skip container`, container.id, name, _.get(network, 'IPAddress'), port)
  }

  getOptions (envs) {
    let env = _.fromPairs(envs.map(parseEnv))
    return {
      name: env['SERVICE_NAME'],
      port: env['SERVICE_PORT'],
      network: env['SERVICE_NETWORK']
    }
  }
}

module.exports = Registrator
