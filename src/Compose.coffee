Promise = require('bluebird');
path = require('path');
gutil = require('gulp-util');
Stream = require('./Stream');
parse = require('./parse');

module.exports = class Compose extends Stream
  constructor: (options)->
    @opt = Object.assign({},options)
    @files = []
    @processed = []
    super()

  getBase: ()->
    unless @_base
      @_base = @files[@files.length-1].base
    @_base

  processFile: (file)->
    index = @files.indexOf(file)
    if index > -1
      @wrapFile(file).then (file)=>
        @files.splice(index, 1)
        @push(file)
        @processed.push(file)
        file
    else
      Promise.reject(new Error('this file is not in the stream'))

  getProcessedFile: (path)->
    Promise.resolve().then =>
      if file = @files.find((file)->file.path == path)
        @processFile(file)
      else if file = @processed.find((file)->file.path == path)
        file

  resolveDependency: (dependency, file)->
    Promise.resolve().then =>
      if match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)
        dependencyPath = path.resolve(path.dirname(file.path)+'/'+match[2]+path.extname(file.path))
        @getProcessedFile(dependencyPath).then (dependencyFile)=>
          if dependencyFile
            dependency.def = dependency.def.replace(match[0],dependencyFile.wraped.namespace+'.'+dependencyFile.wraped.className)
    .then =>
      parse.replaceOptions(@opt,'\n  {{name}} = if dependencies.hasOwnProperty("{{name}}") then dependencies.{{name}} else {{def}}'
        .replace(/\{\{def\}\}/g,dependency.def).replace(/\{\{name\}\}/g,dependency.name))

  wrapFile: (file)->
    Promise.resolve().then =>
      unless file.wraped?
        file.wraped = {
          className: path.basename(file.path,path.extname(file.path))
          namespace: @opt.namespace
        }
        contents = String(file.contents)
        res = parse.extractDependencies(contents)
        contents = res.contents
        dependencies = res.dependencies

        before = """((definition)->
            {{namespace}}.{{className}} = definition()
            {{namespace}}.{{className}}.definition = definition
          )("""
        if dependencies.length
          before += '(dependencies={})->'
        else
          before += '->'
        before = parse.replaceOptions(file.wraped,before)

        Promise.map(dependencies, (dependency)=>@resolveDependency(dependency,file)).then (dependencies)=>
          for dependency in dependencies
            before += dependency


          after = parse.replaceOptions(file.wraped,"""
              {{className}}
            )
          """)

          contents = before + '\n' + contents.replace(/^/gm, "  ") + '\n' + after
          file.contents = new Buffer(contents)
    .then =>
      file
    
  compose: ->
    if @files.length
      @processFile(@files[0]).then =>
        @compose()

  transform: @::collect

  flush: ->
    Promise.resolve().then =>
      @push(new gutil.File({
        cwd: "",
        base: @getBase(),
        path: path.join(@getBase(),'_start.coffee'),
        contents: new Buffer(@opt.namespace + '={}')
      }));
    .then =>
      @compose()
    .then =>
      contents = """
        if module?
          module.exports = {{namespace}}
        else 
          @{{namespace}} = {{namespace}}
      """
      contents = parse.replaceOptions(@opt,contents)
      @push(new gutil.File({
        cwd: "",
        base: @getBase(),
        path: path.join(@getBase(),'_end.coffee'),
        contents: new Buffer(contents)
      }));
