
Wrap = require('./Wrap')
Compose = require('./Compose')
Loader = require('./Loader')
parse = require('./parse')
path = require('path')
vfs = require('vinyl-fs')

module.exports = wrapper = (options) ->
  new Wrap(options)
module.exports.wrap = module.exports
module.exports.compose = (options) ->
  new Compose(options)
module.exports.composeModule = (options,src) ->
  if typeof src == "string"
  	src = [src]
  base = path.dirname(require.resolve(options.module+'/package.json'))
  src = src.map (src)-> 
  	path.join(base,src)
  vfs.src(src)
    .pipe(wrapper.compose(options))
module.exports.loader = (options) ->
  new Loader(options)