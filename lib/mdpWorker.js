
const zmq = require('zeromq')
const uuid  = require('uuid/v4')
const assert = require('assert')
const EventEmitter = require('events')
const moment = require('moment')

const MDP = require('./mdp.js')


class MdpWorker extends EventEmitter {

    constructor(broker, service, options) {

        assert(broker.length > 0)
        assert(service.length > 0)

        // parent class constructor
        super()

        // override default worker options
        options = Object.assign(MDP.WORKER_OPTIONS, options)

        const name = options.name || this.service

        this.broker = broker
        this.service = service
        this.identity = name + '-' + uuid()

        this.heartrate = options.heartrate
        this.reconnect = options.reconnect
        this.heartbeatLiveness = options.heartbeatLiveness
        this.verbose = options.verbose
        this.toString = options.toString
        
        this.socket = null
        this.liveness = null
        this.heartbeatTimer = null

    }

    start() {

        if (this.socket) return

        // create zeromq socket and connect to broker
        this.socket = zmq.socket('dealer')
        this.socket.identity = this.identity
        this.socket.setsockopt('linger', 1)
        this.socket.connect(this.broker)

        // a mutlipart "ready" message consists of 4 frames (see spec)
        let frames = []
        frames[0] = ''              // empty
        frames[1] = MDP.WORKER      // header
        frames[2] = MDP.READY       // command
        frames[3] = this.service    // service name

        this.log('Worker starting: ' + this.identity, frames)

        // tell the broker that we're ready for work
        this.socket.send(frames)

        // setup the event call
        this.socket.on('message', this.onMessage.bind(this))

        // reset liveness
        this.liveness = this.heartbeatLiveness

        // begin heartbeating
        this.heartbeatTimer = setInterval(this.heartbeat.bind(this), this.heartrate)

    }

    // intentionally stop the worker from operating
    // send a disconnect message to broker and close
    stop() {

        if (this.socket) {

            const frames = ['', MDP.WORKER, MDP.DISCONNECT]

            this.log('Worker stopping, send disconnect', frames)

            this.socket.send(frames, 0, this.close.bind(this))

        }

    }

    // gets called whenever the broker connection is lost
    // stop heartbeating and close the socket
    close() {

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer)
            this.heartbeatTimer = null
        }
        
        if (this.socket) {
            this.socket.close()
            this.socket = null
        }

    }

    // send a request to another service
    // this function is called directly by the user
    // IN service (string) - name of the service whose services are needed
    // IN message (string) - the message to send
    send(service, message) {

        if (!this.socket) return

        let frames = []
        frames[0] = ''          // empty
        frames[1] = MDP.CLIENT  // header
        frames[2] = service     // service name
        frames[3] = message     // body

        this.log('Worker sending request: ' + message, frames)

        this.socket.send(frames)

    }


    // send heartbeat to the broker
    heartbeat() {

        this.liveness--

        if (this.liveness <= 0) {
            this.log('Worker temporary timeout', [])
            this.close()
            setTimeout(this.start.bind(this), this.reconnect)
            return
        }

        // a mutlipart "heartbeat" message consists of 3 frames (see spec)
        let frames = []
        frames[0] = ''              // empty
        frames[1] = MDP.WORKER      // header
        frames[2] = MDP.HEARTBEAT   // command

        this.log('Worker sending heartbeat', frames)

        this.socket.send(frames)

    }

    // this event handler is called for every incoming message from the broker
    // receives the frames of the message in the "arguments" variable
    onMessage() {
        
        const frames = Array.from(arguments)

        assert(frames.length >= 3)

        const empty  = frames[0].toString()
        const header = frames[1].toString()

        assert(empty === '')
        assert(header === MDP.WORKER || header === MDP.CLIENT)

        this.liveness = this.heartbeatLiveness

        if (header === MDP.WORKER) this.processMessageAsWorker(frames)

        // this is a response from another worker
        if (header === MDP.CLIENT) this.processMessageAsClient(frames)

    }

    // process client requests, heartbeats, and disconnects
    processMessageAsWorker(frames) {

        const command = frames[2].toString()

        if (command === MDP.REQUEST) {

            assert.equal(frames.length, 6)

            const client    = frames[3].toString()
            const empty     = frames[4].toString()
            const body      = (this.toString ? frames[5].toString() : frames[5])

            let request = {
                body: body,
                client: client
            }

            let response = {
                send: this.sendResponse.bind(this, client)
            }

            this.log('Worker received request from: ' + client, frames)

            this.emit('request', request, response)

        } else if (command === MDP.HEARTBEAT) {
            
            assert.equal(frames.length, 3)
            this.log('Worker receive heartbeat', frames)

        } else if (command === MDP.DISCONNECT) {

            this.log('Worker receive disconnect', frames)
            this.log('Worker temporary timeout', [])
            this.close()
            setTimeout(this.start.bind(this), this.reconnect)

        }
    }

    // process a response from another worker
    processMessageAsClient(frames) {

        assert.equal(frames.length, 4)

        const service = frames[2].toString()

        const message = (this.toString ? frames[3].toString() : frames[3])

        const response = { service: service, body: message }

        this.log('Worker received response from: ' + service, frames)

        this.emit('response', response)

    }


    // send a response message back to the client who requested it
    // this function is curried into the "request" event listener
    // IN client (string) - client identity
    // IN message (string) - users response message
    sendResponse(client, message) {

        let frames = []
        frames[0] = ''
        frames[1] = MDP.WORKER
        frames[2] = MDP.REPLY
        frames[3] = client
        frames[4] = ''
        frames[5] = message

        this.log('Worker sending a response to: ' + client, frames)

        this.socket.send(frames)

    }

    log(header, frames) {
        if (this.verbose) {
            const time = moment().utcOffset(-4).format('YY-MM-DD HH:mm:ss.SSS')
            console.log(time + '\t' + header)
        }
        if (this.verbose === 2) {
            frames.forEach((f,i) => {
                console.log('\t[' + i + '] (' + f.length.toString(16).padStart(3,' ') + ') ' + f)
            })
        }
    }

}

module.exports = MdpWorker