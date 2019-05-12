const fs = require('fs')
const path = require('path')
const Discord = require('discord.js')
const SecretHitler = require('./SecretHitler')
const parseArgs = require('../parseArgs')

const bearFactsTxt = fs.readFileSync(path.resolve(__dirname, './bear-facts.txt'))
const { State, Role, Vote, ElectionResult, Policy } = SecretHitler

class AssertionError extends Error {}
async function assertChannel (channel, condition, message) {
  if (!condition) {
    await channel.send(message)
    throw new AssertionError()
  }
}

async function promptReactionClient (client, user, reactions, ...sendArgs) {
  const message = await user.send(...sendArgs)
  for (const reaction of reactions) {
    await message.react(reaction)
  }

  return new Promise((resolve, reject) => {
    const handler = (messageReaction, user) => {
      if (!user.bot && messageReaction.message.id === message.id) {
        if (reactions.includes(messageReaction.emoji.name)) {
          client.removeListener('messageReactionAdd', handler)
          resolve(messageReaction.emoji.name)
        }
      }
    }
    client.on('messageReactionAdd', handler)
  })
}

module.exports = function secretHitler (client) {
  const command = client.config.commandPrefix + client.config.commandSecretHitler
  const participationEmoji = '✅'
  const voteYesEmoji = '✅'
  const voteNoEmoji = '❌'
  const games = new Map()
  const bearFacts = bearFactsTxt.toString().split('\n')
  bearFacts.pop()

  const promptReaction = promptReactionClient.bind(this, client)

  client.on('message', message => {
    if (message.author.bot) return

    const args = parseArgs(message.content)
    if (args[0] !== command) return

    const { channel, author } = message
    const game = games.get(channel.id)
    const sh = game && game.sh

    const assert = assertChannel.bind(this, channel)

    ;(async () => {
      switch (args[1]) {
        case 'start':
          await assert(!game,
            'A game has already been started in this channel.\n' +
            `Type \`${command} stop\` to stop it.`
          )

          games.set(channel.id, { sh: new SecretHitler() })
          await channel
            .send(
              'Starting a game of Secret Hitler. ' +
              `React to this message with a ${participationEmoji} to join.\n` +
              `Type \`${command} confirm\` to begin.`,
              new Discord.Attachment(path.resolve(__dirname, './images/banner.png'))
            )
            .then(message => {
              message.react(participationEmoji)
              games.get(channel.id).participationMessage = message
            })
          break
        case 'confirm':
          await assert(game,
            'A game has not been started in this channel.\n' +
            `Type \`${command} start\` to start one.`
          )
          await assert(sh.getState() === State.PENDING,
            'A game is already in play in this channel.\n' +
            `Type \`${command} help\` for more information.`
          )

          const { participationMessage } = game
          if (!participationMessage) {
            throw new Error(
              `A game has started in channel ${channel.id}, ` +
              'but the `participationMessage` could not be found.'
            )
          }
          const participationReaction = participationMessage.reactions
            .find(messageReaction => messageReaction.emoji.name === participationEmoji)
          if (!participationReaction) {
            throw new Error(
              `A game has started in channel ${channel.id}, ` +
              `but the ${participationEmoji} reaction on \`participationMessage\` could not be found.`
            )
          }

          const players = participationReaction.users.filter(user => !user.bot)
          // await assert(players.size >= 5,
          //   `Only ${players.size} ${players.size === 1 ? 'user has' : 'users have'} joined the match, and at least 5 are needed.\n` +
          //   'Game has not been started.\n' +
          //   `\`\`\`\n${players.map(user => user.tag).join('\n')}\n\`\`\``
          // )
          await assert(players.size <= 10,
            `${players.size} users have joined the match, but at most 10 can play.\n` +
            'Game has not been started.\n' +
            `\`\`\`\n${players.map(user => user.tag).join('\n')}\n\`\`\``
          )

          sh.initialize(players)
          await channel.send(
            `A game has been started with ${players.size} players. ` +
            'Roles are being sent out to each player...'
          )

          const hitlers = sh.getPlayersWithRole(Role.HITLER)
          const facists = sh.getPlayersWithRole(Role.FACIST)
          await Promise.all(sh.getPlayers().map(user => {
            const bearFact = bearFacts[bearFacts.length * Math.random() | 0]
            switch (sh.getPlayerRole(user)) {
              case Role.HITLER:
                if (players.size <= 6) {
                  return user.send(
                    'You are **Hitler (Facist)**.\n' +
                    `Your fellow Facist is ${facists[0].tag}. ` +
                    'You two know each other’s roles.\n\n' +
                    `Bear Fact: ${bearFact}`
                  )
                } else {
                  return user.send(
                    'You are **Hitler (Facist)**.\n' +
                    'You don’t know who is Facist and who is Liberal. ' +
                    'Your fellow Facists know that you are Hitler.\n\n' +
                    `Bear Fact: ${bearFact}`
                  )
                }
              case Role.FACIST:
                if (players.size <= 6) {
                  return user.send(
                    'You are **Facist**.\n' +
                    `Hitler is ${hitlers[0].tag}. ` +
                    'You two know each other’s roles.\n\n' +
                    `Bear Fact: ${bearFact}`
                  )
                } else {
                  const otherFacists = facists.filter(facist => facist.user.id !== user.id)
                  return user.send(
                    'You are **Facist**.\n' +
                    `Hitler is ${hitlers[0].tag}. ` +
                    `Your fellow ${players.size <= 8 ? 'Facist is' : 'Facists are'} ${otherFacists.map(facist => facist.user.tag).join(', ')}. ` +
                    'Hitler does not know who the Facists are.\n\n' +
                    `Bear Fact: ${bearFact}`
                  )
                }
              case Role.LIBERAL:
                return user.send(
                  'You are **Liberal**.\n' +
                  'You don’t know who the other Facists and Liberals are. ' +
                  'The Facists know that you are Liberal.\n\n' +
                  `Bear Fact: ${bearFact}`
                )
            }
          }))

          const presidentialCandidate = sh.getPresidentialCandidate()
          await channel.send(
            'Roles have been assigned! ' +
            `The turn order is:\n\`\`\`\n${sh.getPlayers().map((user, index) =>
              `${index < 9 ? ' ' : ''}${index + 1}. ${user.tag}`
            ).join('\n')}\n\`\`\`\n\n` +
            `<@${presidentialCandidate.id}> is the first Presidential Candidate.\n` +
            `Type \`${command} nominate @user\` to nominate a Chancellor.`
          )
          break
        case 'nominate':
          await assert(game,
            'A game has not been started in this channel.\n' +
            `Type \`${command} start\` to start one.`
          )
          await assert(sh.getState() === State.ELECTION,
            'It is not time to nominate a Chancellor.\n' +
            `Type \`${command} help\` for more information.`
          )
          await assert(sh.getPresidentialCandidate().id === author.id,
            'You are not the current Presidential Candidate.\n' +
            `Type \`${command} help\` for more information.`
          )

          const nominee = message.mentions.users.first()
          await assert(nominee,
            'You must mention someone to nominate as Chancellor.\n' +
            `Type \`${command} help\` for more information.`
          )
          await assert(nominee.id !== author.id,
            `You cannot nominate yourself for Chancellor.\n` +
            `Type \`${command} help\` for more information.`
          )
          await assert(sh.getPlayerById(nominee.id),
            `<@${nominee.id}> is not a player of the current game.\n` +
            `Type \`${command} help\` for more information.`
          )
          await assert(sh.isAlive(nominee),
            `<@${nominee.id}> is not alive in the current game.\n` +
            `Type \`${command} help\` for more information.`
          )
          await assert(sh.isEligible(nominee),
            `<@${nominee.id}> is not eligible to be a Chancellor.\n` +
            `Type \`${command} help\` for more information.`
          )

          sh.nominateChancellor(nominee)
          await channel.send(
            'The proposed government is:\n' +
            ` - President: <@${author.id}>\n` +
            ` - Chancellor: <@${nominee.id}>\n\n` +
            'Ballots are being sent out to each player...'
          )

          game.votes = {}
          await Promise.all(sh.getAlivePlayers().map(user =>
            promptReaction(
              user,
              [ voteYesEmoji, voteNoEmoji ],
              'The proposed government is:\n' +
              ` - President: ${author.tag}\n` +
              ` - Chancellor: ${nominee.tag}\n\n` +
              `React to this message with a ${voteYesEmoji} or ${voteNoEmoji} to vote.`
            )
              .then(async reaction => {
                switch (reaction) {
                  case voteYesEmoji:
                    game.votes[user.id] = Vote.YES
                    await user.send('You have voted for this government to **pass**.')
                    break
                  case voteNoEmoji:
                    game.votes[user.id] = Vote.NO
                    await user.send('You have voted for this government to **fail**.')
                    break
                }
              })
          ))

          await channel.send(
            'The votes are in:\n' +
            `\`\`\`diff\n${sh.getAlivePlayers().map(user =>
              `${game.votes[user.id] === Vote.YES ? '+ ' : '- '} ${user.tag}`
            ).join('\n')}\n\`\`\``
          )
          const electionResult = sh.voteGovernment(Object.values(game.votes))
          switch (electionResult) {
            case ElectionResult.PASSED:
              await channel.send(
                'The government has been established.\n' +
                `<@${sh.getPreviousPresident().id}> and <@${sh.getPreviousChancellor().id}> will now decide on a policy...`
              )
              const policies = sh.drawPolicies(3)
              const president = sh.getPreviousPresident()
              const chancellor = sh.getPreviousChancellor()
              const presidentSelection = await promptReaction(
                president,
                [ '1⃣', '2⃣', '3⃣' ],
                'You have drawn 3 policies. ' +
                'Select one to **discard**.\n' +
                policies.map((policy, index) =>
                  `  ${index + 1}. ${policy === Policy.LIBERAL ? 'Liberal' : 'Facist'}`
                ).join('\n')
              )
                .then(async reaction => {
                  await president.send(
                    `You have discarded a **${policies[[ '1⃣', '2⃣', '3⃣' ].indexOf(reaction)] === Policy.LIBERAL ? 'Liberal' : 'Facist'}** policy.`
                  )
                  return reaction
                })
              sh.discardPolicies(policies.splice([ '1⃣', '2⃣', '3⃣' ].indexOf(presidentSelection), 1))
              const chancellorSelection = await promptReaction(
                chancellor,
                [ '1⃣', '2⃣' ],
                'The President has given you 2 policies. ' +
                'Select one to **enact**.\n' +
                policies.map((policy, index) =>
                  `  ${index + 1}. ${policy === Policy.LIBERAL ? 'Liberal' : 'Facist'}`
                ).join('\n')
              )
                .then(async reaction => {
                  await chancellor.send(
                    `You have enacted a **${policies[[ '1⃣', '2⃣' ].indexOf(reaction)] === Policy.LIBERAL ? 'Liberal' : 'Facist'}** policy.`
                  )
                  return reaction
                })
              const passedPolicy = policies.splice([ '1⃣', '2⃣' ].indexOf(chancellorSelection), 1)[0]
              sh.enactPolicy(passedPolicy)
              sh.discardPolicies(policies)

              await channel.send(
                `A **${passedPolicy === Policy.LIBERAL ? 'Liberal' : 'Facist'}** policy has been enacted.\n` +
                `<@${sh.getPresidentialCandidate().id}> is now the Presidential Candidate.\n` +
                `Type \`${command} nominate @user\` to nominate a Chancellor.`
              )
              sh.reshufflePolicies()
              break
            case ElectionResult.FAILED:
              const failedGovernmentsCount = sh.getFailedGovernmentsCount()
              await channel.send(
                'The government failed to form. ' +
                `There have been ${failedGovernmentsCount} failed ${failedGovernmentsCount === 1 ? 'government' : 'governments'}.\n` +
                `<@${sh.getPresidentialCandidate().id}> is now the Presidential Candidate.\n` +
                `Type \`${command} nominate @user\` to nominate a Chancellor.`
              )
              break
            case ElectionResult.ANARCHY:
              const policy = sh.drawPolicies(1)[0]
              sh.enactPolicy(policy, true)
              sh.reshufflePolicies()
              switch (policy) {
                case Policy.LIBERAL:
                  await channel.send('Anarchy (TODO)')
                  break
                case Policy.FACIST:
                  await channel.send('Anarchy (TODO)')
                  break
              }
              break
          }
          break
        case 'help':
          await assert(game,
            'A game has not been started in this channel. ' +
            `Type \`${command} start\` to start one.`
          )

          switch (sh.getState()) {
            case State.PENDING:
              await channel.send(
                'A game is currently being created. ' +
                `To join it, react to the message linked below with a ${participationEmoji}.\n` +
                `To start the game, type \`${command} confirm\`.\n\n` +
                game.participationMessage.url
              )
              break
            case State.ELECTION:
              const presidentialCandidate = sh.getPresidentialCandidate()
              const ineligibleCandidates = sh.getIneligibleCandidates()
                .filter(candidate => candidate.id !== presidentialCandidate.id)
              const failedGovernmentsCount = sh.getFailedGovernmentsCount()
              await channel.send(
                `It is <@${presidentialCandidate.id}>’s turn to nominate a Chancellor.\n` +
                (ineligibleCandidates.length > 0
                  ? `The Chancellor cannot be ${ineligibleCandidates.map(candidate => `<@${candidate.id}>`).join(' or ')}.\n`
                  : '') +
                `There have been ${failedGovernmentsCount} failed ${failedGovernmentsCount === 1 ? 'government' : 'governments'}.\n\n` +
                `Type \`${command} nominate @user\` to nominate a Chancellor.`
              )
              break
            case State.ELECTION_VOTE:
              const undecidedPlayers = sh.getAlivePlayers().filter(user => !game.votes[user.id])
              await channel.send(
                'Players must vote on the proposed government:\n' +
                ` - President: <@${sh.getPreviousPresident().id}>\n` +
                ` - Chancellor: <@${sh.getPreviousChancellor().id}>\n\n` +
                'The following players have not voted yet:\n' +
                `\`\`\`\n${undecidedPlayers.map(user => user.tag).join('\n')}\n\`\`\``
              )
              break
            case State.LEGISLATIVE_SESSION:
              await channel.send()
              break
          }
          break
        case 'stop':
          assert(game,
            'A game has not been started in this channel.\n' +
            `Type \`${command} start\` to start one.`
          )

          games.delete(channel.id)
          await channel.send('Game deleted.')
          break
        case 'bearfact':
          const bearFact = bearFacts[bearFacts.length * Math.random() | 0]
          await channel.send(bearFact)
          break
      }
    })().catch(err => {
      if (!(err instanceof AssertionError)) {
        channel
          .send(`Something bad has happened\n\`\`\`diff\n - ${err.message}\n\`\`\``)
          .catch(() => {})
        console.error(err)
      }
    })
  })
}
