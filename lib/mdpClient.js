const zmq = require('zeromq')
const uuid = require('uuid/v4')
const EventEmitter = require('events')

const MDP = require('./mdp.js')


class MdpClient extends EventEmitter {

    constructor(broker, options = {}) {
        super()

        const name = options.name || 'client-'
        this.toString = ('toString' in options) ? options.toString : true

        this.broker = broker
        this.identity = name + '-' + uuid()

        this.socket = null
    }

    start() {

        if (this.socket) return

        this.socket = zmq.socket('dealer')
        this.socket.identity = this.identity
        this.socket.setsockopt('linger', 1)
        this.socket.on('message', this.onMessage.bind(this))
        this.socket.connect(this.broker)

    }

    stop() {

        if (this.socket) {
            this.socket.close()
            this.socket = null
        }

    }

    send(service, message) {

        if (!this.socket) return

        // a mutlipart "request" message consists of 4 frames (see spec)
        let frames = []
        frames[0] = ''           // empty
        frames[1] = MDP.CLIENT  // header
        frames[2] = service      // service name
        frames[3] = message      // request body

        this.socket.send(frames)

    }

    onMessage() {

        //const frames = Array.from(arguments, x => x.toString())

        const empty     = arguments[0].toString()
        const header    = arguments[1].toString()
        const service   = arguments[2].toString()
        const body      = this.toString ? arguments[3].toString() : arguments[3]

        const response = { service: service, body: body }

        this.emit('response', response)

    }

}

module.exports = MdpClient