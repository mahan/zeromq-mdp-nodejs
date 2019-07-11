NodeJS MajorDomo Protocol API
======================================

# Originally from ryanscdavis/zeromq-mdp-nodejs but that repo disappeared somewhere

A NodeJS implementation of Worker and Client API's of the Majordomo pattern protocol.

Pattern: http://zguide.zeromq.org/page:all#header-99

Specification: https://rfc.zeromq.org/spec:7/MDP/

## Installation

```
npm install @mahan/zeromq-mdp-nodejs
```


## Worker API

```
const brokerURL = 'tcp://127.0.0.1:5555'
const serviceName = 'hello-world-service'

let worker = new mdp.Worker(brokerURL, serviceName)

worker.on('request', (req, res) => {
    // process request and respond
    res.send(req.body + ' world!')
})

worker.start()

```


## Client API

```
const brokerURL = 'tcp://127.0.0.1:5555'

let client = mdp.Client(brokerURL)

client.on('response', (res) => {
    // process the response
    console.log('Client received message: ', res.body)
})

client.start()
client.send('hello-world-service', 'hello')
```

## Worker Options


| Option            | Default | Description                                                        |
|-------------------|---------|--------------------------------------------------------------------|
| heartrate         | 2500    | The heartbeat timeout in milliseconds.                             |
| reconnect         | 2500    | The time in milliseconds before attempting to reconnect to broker. |
| heartbeatLiveness | 3       | The number of heartbeats before disconnecting from broker.         |
| verbose           | 1       | Verbosity levels for logging (0-none, 1-events, 2-messages).       |
| name              | service | The identity prefix of the worker, defaults to the service name.   |
| toString          | true    | Convert received messages from Buffer to String.                   |
