const State = {
  PENDING: 'pending',
  ELECTION: 'election',
  LEGISLATIVE_SESSION: 'legislative session',
  EXECUTIVE_ACTION: 'executive action'
}

const Roles = {
  HITLER: 'hitler',
  FACIST: 'facist',
  LIBERAL: 'liberal'
}

function shuffle (arr) {
  for (let i = arr.length - 1; i > 0; --i) {
    const j = (i + 1) * Math.random() | 0
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

module.exports = class SecretHitler {
  constructor () {
    this.state = State.PENDING
  }

  initialize (users) {
    const { HITLER, FACIST, LIBERAL } = Roles
    const roles = shuffle(({
      5: [ HITLER, FACIST, LIBERAL, LIBERAL, LIBERAL ],
      6: [ HITLER, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL ],
      7: [ HITLER, FACIST, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL ],
      8: [ HITLER, FACIST, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL, LIBERAL ],
      9: [ HITLER, FACIST, FACIST, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL, LIBERAL ],
      10: [ HITLER, FACIST, FACIST, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL, LIBERAL, LIBERAL ]
    })[users.size])
    this.players = users.array().map((user, index) => ({
      user,
      role: roles[index]
    }))
    this.state = State.ELECTION
  }
}

module.exports.State = State
module.exports.Roles = Roles
