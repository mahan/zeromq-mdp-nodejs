
const mdp = require('..')

const broker = 'tcp://host.docker.internal:5555'

let worker = new mdp.Worker(broker, 'configuration', { verbose: 1 })

worker.on('request', (req, res) => res.send(req.body + ' world!'))

worker.start()
