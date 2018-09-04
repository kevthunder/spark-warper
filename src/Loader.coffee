Promise = require('bluebird');
path = require('path');
gutil = require('gulp-util');
upath = require('upath');
Stream = require('./Stream');
parse = require('./parse');

module.exports = class Loader extends Stream
  constructor: (options)->
    super()
    if !options.namespace?
      throw new Error('spark-wrapper: namespace needed')
    @opt = Object.assign({},options)

  transform: @::collect

  getBase: ()->
    unless @_base
      @_base = @files[@files.length-1].base
    @_base

  flush: ->
    namespaceFile = path.join(@getBase(), (@opt.filename || @opt.namespace)+'.js')

    contents = 'if(module){\n'
    contents += '  module.exports = {\n'
    contents += @files.filter (file)->
      file.wraped
    .map (file)->
      '    '+file.wraped.className+": require('./"+upath.relative(path.dirname(namespaceFile),file.path)+"')"
    .join(",\n")
    contents += '\n  };\n}'

    @files.forEach (file)=>
      this.push(file)

    this.push(new gutil.File({
      cwd: "",
      base: @getBase(),
      path: namespaceFile,
      contents: new Buffer(contents)
    }))