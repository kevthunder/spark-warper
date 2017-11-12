
Wrap = require('./Wrap')
Compose = require('./Compose')
Loader = require('./Loader')
ComposeModule = require('./ComposeModule')


module.exports = wrapper = (options) ->
  new Wrap(options)
module.exports.wrap = module.exports
module.exports.compose = (options) ->
  new Compose(options)
module.exports.composeModule = (options,src) ->
  new ComposeModule(options,src)
module.exports.loader = (options) ->
  new Loader(options)