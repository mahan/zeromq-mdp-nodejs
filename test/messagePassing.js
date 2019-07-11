
const assert = require('assert');

const mdp = require('../index.js')

// a broker service must be running in order for these tests to work
const broker = 'tcp://host.docker.internal:5555'

describe('Message Passing', function () {

    const workerOptions = { 'verbose': 0 }

    // test a single client worker pair
    it('Simple Request / Reply', function (done) {

        let worker = new mdp.Worker(broker, 'hello-service', workerOptions)
        let client = new mdp.Client(broker)

        // worker response "hello world!"
        worker.on('request', (req, res) => {
            res.send(req.body + ' world!')
        })

        // client checks response
        client.on('response', res => {
            assert.equal(res.service, 'hello-service')
            assert.equal(res.body, 'hello world!')
            worker.stop()
            client.stop()
            done()
        })

        worker.start()
        client.start()

        // client sends "hello"
        client.send('hello-service', 'hello')

    })

    // 10 workers and 10 clients sending echo messages
    it('Multiple Workers and Clients', function (done) {

        const n = 10
        let workers = []
        let clients = []
        let replyCount = 0

        const echo = (req, res) => { res.send(req.body + 'W' + req.body) }

        for (let i = 0; i < n; i++) {
            workers[i] = new mdp.Worker(broker, 'echo-service', workerOptions)
            workers[i].on('request', echo)
            workers[i].start()
        }

        for (let i = 0; i < n; i++) {
            clients[i] = new mdp.Client(broker)
            clients[i].on('response', res => {
                assert.equal(res.body, i.toString() + 'W' + i.toString())
                replyCount++
            })
            clients[i].start()
            clients[i].send('echo-service', i.toString())
        }

        setTimeout(() => {

            // check that all responses have been received
            if (replyCount === n) {
                for (let i = 0; i < n; i++) {
                    workers[i].stop()
                    clients[i].stop()
                }
                done()
            }

        }, 500)

    })

    // two workers on service A, one worker on service B
    it('Multiple Services', function (done) {

        let workerA = new mdp.Worker(broker, 'serviceA', workerOptions)
        let workerB = new mdp.Worker(broker, 'serviceB', workerOptions)
        let workerC = new mdp.Worker(broker, 'serviceA', workerOptions)

        let client = new mdp.Client(broker)

        let workA = (req, res) => res.send(req.body + 'A')
        let workB = (req, res) => res.send(req.body + 'B')

        let countA = 0
        let countB = 0

        workerA.on('request', workA)
        workerB.on('request', workB)
        workerC.on('request', workA)

        // client checks for correct responses
        client.on('response', res => {

            assert(res.service === 'serviceA' || res.service === 'serviceB')

            if (res.service === 'serviceA') {
                assert.equal(res.body, 'AA')
                countA++
            }

            if (res.service === 'serviceB') {
                assert.equal(res.body, 'BB')
                countB++
            }

        })

        workerA.start()
        workerB.start()
        workerC.start()
        client.start()

        client.send('serviceA', 'A')
        client.send('serviceB', 'B')
        client.send('serviceA', 'A')
        client.send('serviceB', 'B')
        client.send('serviceA', 'A')

        setTimeout(() => {

            if (countA === 3 && countB === 2) {
                workerA.stop()
                workerB.stop()
                workerC.stop()
                client.stop()
                done()
            }

        }, 500)

    })


})