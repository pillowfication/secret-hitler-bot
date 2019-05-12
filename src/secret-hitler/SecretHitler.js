const State = {
  PENDING: 'pending',
  ELECTION: 'election',
  ELECTION_VOTE: 'election vote',
  LEGISLATIVE_SESSION: 'legislative session',
  EXECUTIVE_ACTION: 'executive action'
}
const Role = {
  HITLER: 'hitler',
  FACIST: 'facist',
  LIBERAL: 'liberal'
}
const Vote = {
  YES: 'yes',
  NO: 'no'
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
    const { HITLER, FACIST, LIBERAL } = Role
    const roles = shuffle(({
      5: [ HITLER, FACIST, LIBERAL, LIBERAL, LIBERAL ],
      6: [ HITLER, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL ],
      7: [ HITLER, FACIST, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL ],
      8: [ HITLER, FACIST, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL, LIBERAL ],
      9: [ HITLER, FACIST, FACIST, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL, LIBERAL ],
      10: [ HITLER, FACIST, FACIST, FACIST, LIBERAL, LIBERAL, LIBERAL, LIBERAL, LIBERAL, LIBERAL ]
    })[users.size])

    this.players = shuffle(users.array().map((user, index) => ({
      user,
      role: roles[index],
      isAlive: true
    })))
    this.state = State.ELECTION
    this.presidentPlacard = 0
    this.previousPresident = null
    this.previousChancellor = null
    this.failedGovernmentsCount = 0
    this.chancellorCandidate = null
  }

  _findPlayer (user) {
    return this.players.find(player => player.user.id === user.id)
  }

  getPlayers () {
    return this.players.map(player => player.user)
  }

  getAlivePlayers () {
    return this.players.filter(player => player.isAlive).map(player => player.user)
  }

  getPlayerRole (user) {
    return this._findPlayer(user).role
  }

  getPlayersWithRole (role) {
    return this.players
      .filter(player => player.role === role)
      .map(player => player.user)
  }

  getPlayerById (id) {
    const player = this._findPlayer({ id })
    return player && player.user
  }

  getPresidentialCandidate () {
    return this.players[this.presidentPlacard].user
  }

  getIneligibleCandidates () {
    const ineligibleCandidates = []
    if (this.previousPresident && this.previousPresident.isAlive) {
      ineligibleCandidates.push(this.previousPresident)
    }
    if (this.previousChancellor && this.previousChancellor.isAlive) {
      ineligibleCandidates.push(this.previousChancellor)
    }
    return ineligibleCandidates
  }

  getFailedGovernmentsCount () {
    return this.failedGovernmentsCount
  }

  isAlive (user) {
    return this._findPlayer(user).isAlive
  }

  isEligible (user) {
    return this.isAlive(user) &&
      (this.previousPresident === null || this.previousPresident.id !== user.id) &&
      (this.previousChancellor === null || this.previousChancellor.id !== user.id)
  }

  nominateChancellor (user) {
    this.state = State.ELECTION_VOTE
    this.chancellorCandidate = user
  }

  voteGovernment (votes) {

  }
}

module.exports.State = State
module.exports.Role = Role
module.exports.Vote = Vote
