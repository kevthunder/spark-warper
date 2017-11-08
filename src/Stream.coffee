through = require('through2')
Promise = require('bluebird');

module.exports = class Stream extends through.ctor()
  constructor: ()->
    super({ objectMode: true, highWaterMark: 16 })

  transform: (file, enc)->
    Promise.resolve(file)

  collect: (file, enc)->
    unless @files?
      @files = []
    @files.push(file)
    null

  flush: ()->
    Promise.resolve()

  _transform: (file, enc, cb) ->
    Promise.resolve()
    .then =>
      @transform(file, enc)
    .asCallback(cb)

  end: ->
    Promise.resolve()
    .then =>
      @flush()
    .finally =>
      super()