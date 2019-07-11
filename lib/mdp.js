
let MDP = {}

// default options
MDP.WORKER_OPTIONS = {
    heartrate: 2500,
    reconnect: 2500,
    heartbeatLiveness: 3,
    verbose: 1,
    name: null,
    toString: true
}

// VERBOSITY LEVELS
// 0) log nothing
// 1) log events: requests, heartbeats, etc
// 2) log message frames

// headers
MDP.CLIENT = 'MDPC01'
MDP.WORKER = 'MDPW01'

// message commands
MDP.READY         = '\u0001'
MDP.REQUEST       = '\u0002'
MDP.REPLY         = '\u0003'
MDP.HEARTBEAT     = '\u0004'
MDP.DISCONNECT    = '\u0005'

module.exports = MDP