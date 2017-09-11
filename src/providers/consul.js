const Consul = require('consul')
const _ = require('lodash')

const TAG_NAME = 'Docker-Bridge'

class ConsulProvider {
  constructor (url) {
    this.consul = new Consul({baseUrl: url, promisify: true})
  }

  addService (service) {
    return this.consul.agent.service.register({
      Id: service.id,
      Name: service.name,
      Address: service.address,
      Port: service.port,
      Tags: [TAG_NAME]
    })
  }

  removeService (id) {
    return this.consul.agent.service.deregister(id)
  }

  listServices () {
    return this.consul.agent.service.list()
      .then(_.values)
      .then(this.filterByTag)
      .then(services => services.map(this.toService))
  }

  filterByTag (services) {
    return _.filter(services, service => _.includes(service.Tags, TAG_NAME))
  }

  toService (service) {
    return {
      id: service.ID,
      name: service.Service,
      address: service.Address,
      port: service.Port
    }
  }
}

module.exports = ConsulProvider
