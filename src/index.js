const Discord = require('discord.js')
const client = new Discord.Client()

;(async () => {
  let config
  try {
    config = require('../config.json')
    client.config = config
    require('./secret-hitler')(client)

    client.on('ready', () => console.log('Secret Hitler Discord Bot started'))
    await client.login(config.discordToken)
  } catch (err) {
    console.error(err.message)
    console.error('Follow instructions in README.md to set up the Discord token for your bot.')
    process.exitCode = 1
  }
})()
