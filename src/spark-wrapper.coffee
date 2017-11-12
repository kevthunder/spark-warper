
Wrap = require('./Wrap')
Compose = require('./Compose')
Loader = require('./Loader')


module.exports = wrapper = (options) ->
  new Wrap(options)
module.exports.wrap = module.exports
module.exports.compose = (options) ->
  new Compose(options)
module.exports.composeModule = require('./composeModule')
module.exports.loader = (options) ->
  new Loader(options)