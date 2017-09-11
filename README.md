# docker-consul-bridge

Node service which listens to docker daemon and registers containers in consul

Tested with node 8.2.1

Sample usage `./src/boot.js --consul http://localhost:8500/v1 --socket /var/run/docker.sock --resync 60`

### Arguments:

* --consul - consul url
* --socket - path to docker socket
* --resync - resync interval in seconds (optional)

### To be register container should have following env variables:

* SERVICE_NAME (required) service name in consul
* SERVICE_PORT (optional) port to register in consul (by default first port will be used)
* SERVICE_NETWORK (optional) network name to register in consul (by default first network will be used)
