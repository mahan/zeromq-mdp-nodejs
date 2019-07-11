
// this example creates a single client and worker pair
// the client sends a 'hello' message to the 'hello-world-service'
// the worker responds by appending ' world!' to the request
// the client then receives a response 'hello world!'

const mdp = require('../index.js')

const broker = 'tcp://host.docker.internal:5555'

let worker = new mdp.Worker(broker, 'hello-world-service', { verbose: 2 })
let client = new mdp.Client(broker)

worker.on('request', (req, res) => res.send(req.body + ' world!'))

client.on('response', (response) => {
    console.log('Client received message: ', response.body)
    client.stop()
    worker.stop()
})

worker.start()
client.start()

console.log('Client saying hello')
client.send('hello-world-service', 'hello')
