const fs = require('fs')
const path = require('path')
const Discord = require('discord.js')
const SecretHitler = require('./SecretHitler')
const parseArgs = require('../parseArgs')

const bearFactsTxt = fs.readFileSync(path.resolve(__dirname, './bear-facts.txt'))
const { State, Roles } = SecretHitler

module.exports = function secretHitler (client) {
  const command = client.config.commandPrefix + client.config.commandSecretHitler
  const participationEmoji = '✅'
  const games = new Map()
  const bearFacts = bearFactsTxt.toString().split('\n')
  bearFacts.pop()

  client.on('message', message => {
    if (message.author.bot) return

    const args = parseArgs(message.content)
    if (args[0] !== command) return

    const { channel, author } = message
    const game = games.get(channel.id)

    ;(async () => {
      switch (args[1]) {
        case 'start':
          if (game) {
            await channel.send(
              'A game has already been started in this channel. ' +
              `Type \`${command} stop\` to stop it.`
            )
          } else {
            games.set(channel.id, { sh: new SecretHitler() })
            await channel
              .send(
                'Starting a game of Secret Hitler. ' +
                `React to this message with a ${participationEmoji} to join. ` +
                `Then type \`${command} confirm\` to begin.`,
                new Discord.Attachment(path.resolve(__dirname, './images/banner.png'))
              )
              .then(message => {
                message.react(participationEmoji)
                games.get(channel.id).participationMessage = message
              })
          }
          break
        case 'confirm':
          if (game) {
            const { participationMessage } = games.get(channel.id)
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
            if (players.size < 5) {
              await channel.send(
                `Only ${players.size} ${players.size === 1 ? 'user has' : 'users have'} joined the match, and at least 5 are needed. ` +
                'Game has not been started.\n' +
                `\`\`\`${players.map(user => user.tag).join(', ')}\n\`\`\``
              )
            } else if (players.size > 10) {
              await channel.send(
                `${players.size} users have joined the match, but at most 10 can play. ` +
                'Game has not been started.\n' +
                `\`\`\`${players.map(user => user.tag).join(', ')}\n\`\`\``
              )
            } else {
              game.sh.initialize(players)
              await channel.send(
                `A game has been started with ${players.size} players. ` +
                'Roles are being sent out...'
              )

              const hitlers = game.sh.players.filter(player => player.role === Roles.HITLER)
              const facists = game.sh.players.filter(player => player.role === Roles.FACIST)
              for (const player of game.sh.players) {
                const bearFact = bearFacts[bearFacts.length * Math.random() | 0]
                switch (player.role) {
                  case Roles.HITLER:
                    if (players.size <= 6) {
                      player.user.send(
                        'You are **Hitler (Facist)**.\n' +
                        `Your fellow Facist is ${facists[0].user.tag}. ` +
                        'You two know each other’s roles.\n\n' +
                        `Bear Fact: ${bearFact}`
                      )
                    } else {
                      player.user.send(
                        'You are **Hitler (Facist)**.\n' +
                        'You don’t know who is Facist and who is Liberal. ' +
                        'Your fellow Facists know that you are Hitler.\n\n' +
                        `Bear Fact: ${bearFact}`
                      )
                    }
                    break
                  case Roles.FACIST:
                    if (players.size <= 6) {
                      player.user.send(
                        'You are **Facist**.\n' +
                        `Hitler is ${hitlers[0].user.tag}. ` +
                        'You two know each other’s roles.\n\n' +
                        `Bear Fact: ${bearFact}`
                      )
                    } else {
                      const otherFacists = facists.filter(facist => facist.user.id !== player.user.id)
                      player.user.send(
                        'You are **Facist**.\n' +
                        `Hitler is ${hitlers[0].user.tag}. ` +
                        `Your fellow ${players.size <= 8 ? 'Facist is' : 'Facists are'} ${otherFacists.map(facist => facist.user.tag).join(', ')}. ` +
                        'Hitler does not know who the Facists are.\n\n' +
                        `Bear Fact: ${bearFact}`
                      )
                    }
                    break
                  case Roles.LIBERAL:
                    player.user.send(
                      'You are **Liberal**.\n' +
                      'You don’t know who the other Facists and Liberals are. ' +
                      'The Facists know that you are Liberal.\n\n' +
                      `Bear Fact: ${bearFact}`
                    )
                    break
                }
              }
            }
          } else {
            await channel.send(
              'A game has not been started in this channel. ' +
              `Type \`${command} start\` to start one.`
            )
          }
          break
        case 'help':
          if (game) {
            switch (game.sh.state) {
              case State.PENDING:
                await channel.send(
                  'A game is currently being created. ' +
                  `To join it, react to the message linked below with a ${participationEmoji}. ` +
                  `To start the game, type \`${command} confirm\`.\n\n` +
                  game.participationMessage.url
                )
                break
            }
          } else {
            await channel.send(
              'A game has not been started in this channel. ' +
              `Type \`${command} start\` to start one.`
            )
          }
          break
        case 'stop':
          games.delete(channel.id)
          await channel.send('Game deleted.')
          break
        case 'bearfact':
          const bearFact = bearFacts[bearFacts.length * Math.random() | 0]
          await channel.send(bearFact)
          break
      }
    })().catch(err => {
      channel
        .send(`Something bad has happened\n\`\`\`\n${err.message}\n\`\`\``)
        .catch(() => {})
      console.error(err)
    })
  })
}
