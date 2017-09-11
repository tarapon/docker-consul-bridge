const StreamSplitter = require('stream-split')
const EventEmitter = require('events')

class EventsListener extends EventEmitter {
  listen (stream) {
    let splitter = new StreamSplitter(new Buffer("\n"))
    stream.pipe(splitter).on('data', data => {
      let event = JSON.parse(data)
      this.emit(event.status, event)
    })
  }
}

module.exports = EventsListener
