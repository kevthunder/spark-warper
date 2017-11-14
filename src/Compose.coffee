Promise = require('bluebird');
path = require('path');
gutil = require('gulp-util');
Stream = require('./Stream');
parse = require('./parse');

module.exports = class Compose extends Stream
  constructor: (options)->
    @opt = Object.assign({exclude:/^_/},options)
    @files = []
    @processed = []
    super()

  getBase: ()->
    unless @_base
      @_base = @files[@files.length-1].base
    @_base

  processFile: (file)->
    if @files.includes(file)
      @wrapFile(file).then (file)=>
        index = @files.indexOf(file)
        if index > -1
          @files.splice(index, 1)
          @processed.push(file)
        file
    else
      Promise.reject(new Error('this file is not in the stream'))

  getProcessedFile: (path)->
    find = (file)->
      file.path == path
    Promise.resolve().then =>
      if file = @files.find(find)
        @processFile(file)
      else if file = @processed.find(find)
        file
  getProcessedByRef: (module, ref)->
    find = (file)->
      file.wrapped?.module == module && ref.indexOf(file.wrapped.className) == 0
    Promise.resolve().then =>
      if file = @files.find(find)
        @processFile(file)
      else if file = @processed.find(find)
        file

  resolveDependency: (dependency, file)->
    match = null
    Promise.resolve().then =>
      if @opt.aliases? && (match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)) && @opt.aliases[match[2]]?
        dependency.def = dependency.def.replace(match[0],@opt.aliases[match[2]])
        null
      else if match = /require\(['"]([-_\d\w]+)['"]\)((\.[_\d\w]+)+)/.exec(dependency.def)
        module = match[1]
        ref = match[2].substring(1)
        @getProcessedByRef(module, ref)
      else if match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)
        dependencyPath = path.resolve(path.dirname(file.path)+'/'+match[2]+path.extname(file.path))
        @getProcessedFile(dependencyPath)
    .then (dependencyFile)=>
      if dependencyFile
        dependency.def = dependency.def.replace(match[0],dependencyFile.wrapped.namespace+'.'+dependencyFile.wrapped.className)
        unless file.wrapped.dependencies
          file.wrapped.dependencies = []
        file.wrapped.dependencies.push(dependencyFile.path)
    .then =>
      parse.replaceOptions(@opt,'\n  {{name}} = if dependencies.hasOwnProperty("{{name}}") then dependencies.{{name}} else {{def}}'
        .replace(/\{\{def\}\}/g,dependency.def).replace(/\{\{name\}\}/g,dependency.name))

  wrapFile: (file)->
    Promise.resolve().then =>
      if file.wrapped?
        if file.wrapped.dependencies
          Promise.all file.wrapped.dependencies.map (dependency)=>
            @getProcessedFile(dependency)
      else if !path.basename(file.path).match(@opt.exclude)
        @addFileOptions(file)
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
        before = parse.replaceOptions(file.wrapped,before)

        Promise.map(dependencies, (dependency)=>@resolveDependency(dependency,file)).then (dependencies)=>
          for dependency in dependencies
            before += dependency


          after = parse.replaceOptions(file.wrapped,"""
              {{className}}
            )
          """)

          contents = before + '\n' + contents.replace(/^/gm, "  ") + '\n' + after
          file.contents = new Buffer(contents)
    .then =>
      file
  addFileOptions: (file)->
    options = Object.assign({},@opt,{
      className: path.basename(file.path,path.extname(file.path))
    })
    file.wrapped = options;
  compose: ->
    if @files.length
      @processFile(@files[0]).then =>
        @compose()

  transform: @::collect

  flush: ->
    Promise.resolve().then =>
      file = new gutil.File({
        cwd: "",
        base: @getBase(),
        path: path.join(@getBase(),'_start.coffee'),
        contents: new Buffer(@opt.namespace + '={}')
      })
      file.wrapped = Object.assign({
        special: 'start'
      },@opt)
      @push(file);
    .then =>
      @compose()
    .then =>
      for file in @processed
        if file.wrapped?.special == 'start' && file.wrapped.namespace != @opt.namespace
          @push(file)
      for file in @processed
        unless file.wrapped?.special == 'end' || file.wrapped?.special == 'start'
          @push(file)
    .then =>
      contents = """
        if module?
          module.exports = {{namespace}}
        else 
          @{{namespace}} = {{namespace}}
      """
      contents = parse.replaceOptions(@opt,contents)
      file = new gutil.File({
        cwd: "",
        base: @getBase(),
        path: path.join(@getBase(),'_end.coffee'),
        contents: new Buffer(contents)
      })
      file.wrapped = {
        special: 'end'
      }
      @push(file);
