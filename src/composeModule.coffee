Compose = require('./Compose')
vfs = require('vinyl-fs')
path = require('path')
Module = require("module")

resolve = (request) ->
    Module._resolveFilename(request, require.main, false)

module.exports = (options,src) ->
  if typeof src == "string"
  	src = [src]
  base = path.dirname(resolve(options.module+'/package.json'))
  src = src.map (src)-> 
  	path.join(base,src)
  vfs.src(src)
    .pipe(new Compose(options))