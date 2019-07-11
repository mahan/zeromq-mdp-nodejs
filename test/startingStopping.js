const assert = require('assert');

const mdp = require('../index.js')

// a broker service must be running in order for these tests to work
const broker = 'tcp://host.docker.internal:5555'

describe('Starting & Stopping', function () {

    const workerOptions = { 'verbose': 0 }

    it('Worker Rapid Starts', function (done) {

        let worker = new mdp.Worker(broker, 'hello-service', workerOptions)
        let client = new mdp.Client(broker)

        let replyCount = 0

        // worker response "hello world!"
        worker.on('request', (req, res) => {
            res.send(req.body + ' world!')
        })

        // client checks response
        client.on('response', res => {
            
            assert.equal(res.service, 'hello-service')
            assert.equal(res.body, 'hello world!')

            replyCount++

            if (replyCount == 2) {
                worker.stop()
                client.stop()
                done()
            }

        })
        
        worker.start()
        worker.start()
        worker.start()

        client.start()
        client.send('hello-service', 'hello')

        worker.start()
        worker.start()
        worker.start()

        client.send('hello-service', 'hello')

    })


    it('Worker Rapid Stops', function (done) {

        let worker = new mdp.Worker(broker, 'hello-service', workerOptions)
        let client = new mdp.Client(broker)

        let replyCount = 0

        // worker response "hello world!"
        worker.on('request', (req, res) => {
            res.send(req.body + ' world!')
        })

        // client checks response
        client.on('response', res => {
            assert.equal(res.service, 'hello-service')
            assert.equal(res.body, 'hello world!')

            replyCount++

            if (replyCount == 2) {
                worker.stop()
                client.stop()
                done()
            }

        })
        
        worker.start()
        client.start()

        // client sends "hello"
        client.send('hello-service', 'hello')

        // stop multiple times
        worker.stop()
        worker.stop()
        worker.stop()
        worker.stop()

        setTimeout(() => {
            worker.start()
            client.send('hello-service', 'hello')
        }, 200)

    })

})