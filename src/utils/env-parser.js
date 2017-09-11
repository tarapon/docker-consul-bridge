module.exports = (env) => {
  let index = env.indexOf('=')
  return [env.substring(0, index), env.substring(index + 1)]
}
