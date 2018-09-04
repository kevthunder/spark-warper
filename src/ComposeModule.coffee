Compose = require('./Compose')
vfs = require('vinyl-fs')
path = require('path')
Module = require("module")
Promise = require('bluebird');
Stream = require('./Stream');

module.exports = class ComposeModule extends Stream
  constructor: (options,@src)->
    super()
    @opt = Object.assign(options)
    @piped = false
    this.on 'pipe', => 
      @piped = true
    @composeStream = @streamToPromise new Compose(@opt), (file)=>
      @push(file)
    @fileStream = @streamToPromise @getFilesStream(), (file)=>
      @composeStream.stream.write(file)
    @fileStream
      .finally =>
        unless @piped
          @end()

  streamToPromise: (stream,fn)->
    p = new Promise (resolve, reject)=>
      stream.on 'data', fn
      stream.on 'end', => 
        resolve()
      stream.on 'close', => 
        resolve()
      stream.on 'error', (err) => 
        reject(err)
    p.stream = stream
    p

  getFilesStream: ->
    src = @src
    if typeof src == "string"
      src = [src]
    base = @getBase()
    src = src.map (src)-> 
      path.join(base,src)
    vfs.src(src)

  getBase: ->
    path.dirname(Module._resolveFilename(@opt.module+'/package.json', require.main, false))


  _transform: (file, enc, cb) ->
    @composeStream.stream.write(file, enc, cb)


  flush: ->
    @composeStream.stream.end()
    @composeStream