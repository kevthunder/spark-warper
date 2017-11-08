
Wrap = require('./Wrap');
Compose = require('./Compose');
Loader = require('./Loader');
parse = require('./parse');

module.exports = (options) ->
  new Wrap(options)
module.exports.wrap = module.exports
module.exports.compose = (options) ->
  new Compose(options)
module.exports.loader = (options) ->
  new Loader(options)