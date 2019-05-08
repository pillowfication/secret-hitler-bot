module.exports = function parseArgs (command) {
  if (!command) return []

  const regex = /"((?:[^"\\]|\\.)*)(?:"|$)|'((?:[^'\\]|\\.)*)(?:'|$)|(\S+)/g
  const args = []

  for (let match; (match = regex.exec(command));) {
    const arg = match[1] || match[2] || match[3]
    args.push(arg || '')
  }

  return args
}
