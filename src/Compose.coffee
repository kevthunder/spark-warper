Promise = require('bluebird');
path = require('path');
gutil = require('gulp-util');
Stream = require('./Stream');
parse = require('./parse');

module.exports = class Compose extends Stream
  constructor: (options)->
    @opt = @parseOptions(options)
    @files = []
    @processed = []
    super()

  parseOptions: (options)->
    opt = Object.assign({exclude:/^_/},options)
    unless opt.varname?
      opt.varname = if opt.module
          opt.namespace
        else
          opt.namespace.split('.').pop()
    opt

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
    else if @processed.includes(file)
      Promise.resolve(file)
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

  getSingletonModule: (module)->
    find = (file)->
      file.wrapped?.module == module && file.wrapped.className? && file.wrapped.className == file.wrapped.main
    @files.find(find) || @processed.find(find)


  resolveDependency: (dependency, file)->
    match = null
    Promise.resolve().then =>
      if @opt.aliases? && (match = /require(\(|\s*)['"](\.\/)?([^'"]+)['"]\)?/.exec(dependency.def)) && found = @opt.aliases[match[3]]
        dependency.def = dependency.def.replace(match[0],found)
        null
      else if (match = /require\(['"]([-_\d\w]+)['"]\)/.exec(dependency.def)) && singleton = @getSingletonModule(match[1])
        @processFile(singleton)
      else if match = /require\(['"]([-_\d\w]+)['"]\)((\.[_\d\w]+)+)/.exec(dependency.def)
        module = match[1]
        ref = match[2].substring(1)
        @getProcessedByRef(module, ref)
      else if match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)
        dependencyPath = path.resolve(path.dirname(file.path)+'/'+match[2]+path.extname(file.path))
        @getProcessedFile(dependencyPath)
    .then (dependencyFile)=>
      if dependencyFile
        dependency.def = dependency.def.replace(match[0],dependencyFile.wrapped.varname+'.'+dependencyFile.wrapped.className)
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
            {{varname}}.{{className}} = definition()
            {{varname}}.{{className}}.definition = definition
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

  makeNamespaceCreator: (namespace,prefix='',indent='')->
    parts = namespace.split('.');
    createNamespace = ''
    for part in parts
      createNamespace+= "\n"+indent+"unless "+prefix+part+"?"
      createNamespace+= "\n"+indent+"   "+prefix+part+" = {}"
      prefix += part + '.'
    createNamespace

  makeStartFile: ->
    if @opt.partOf?
      if @opt.partOf == @opt.namespace
        contents = """
          {{varname}} = if module?
            module.exports
          else
            @{{namespace}}
        """
      else
        contents = """
          {{varname}} = if module?
            {{parentVarname}} = module.exports
            {{createSubNamespace}}
            {{parentVarname}}.{{afterParent}}
          else
            {{parentVarname}} = @{{partOf}}
            {{createNamespace}}
            @{{namespace}}
        """
        afterParent = @opt.namespace.substring(@opt.partOf.length+1)
        contents = contents.replace(/\{\{partOf\}\}/g, @opt.partOf)
        contents = contents.replace(/\{\{parentVarname\}\}/g, @opt.partOf.split('.').pop())
        contents = contents.replace(/\{\{afterParent\}\}/g, afterParent)
        contents = contents.replace(/\{\{createSubNamespace\}\}/g, @makeNamespaceCreator(afterParent,@opt.partOf+'.','  '))
        contents = contents.replace(/\{\{createNamespace\}\}/g, @makeNamespaceCreator(@opt.namespace.substring(@opt.partOf.length+1),'@'+@opt.partOf+'.','  '))
    else
      contents = """
        {{varname}} = if module?
          module.exports =  {}
        else
          {{createNamespace}}
          @{{namespace}}
      """
      contents = contents.replace(/\{\{createNamespace\}\}/g, @makeNamespaceCreator(@opt.namespace,'@','  '))
    contents = parse.replaceOptions(@opt,contents)
    file = new gutil.File({
      cwd: "",
      base: @getBase(),
      path: path.join(@getBase(),'_start.coffee'),
      contents: new Buffer(contents)
    })
    file.wrapped = Object.assign({
      special: 'start'
    },@opt)
    file

  makeSubStartFile: (file)->
    if file.wrapped.namespace == @opt.namespace
      null
    else if file.wrapped.namespace.indexOf(@opt.namespace+'.') == 0
      contents ="""
        {{createNamespace}}
      """
      contents = contents.replace(/\{\{createNamespace\}\}/g, @makeNamespaceCreator(file.wrapped.namespace.substring(@opt.namespace.length+1),@opt.namespace+'.'))
      contents = parse.replaceOptions(file.wrapped,contents)
      file.contents = new Buffer(contents)
      file
    else
      file

  flush: ->
    Promise.resolve().then =>
      @push(@makeStartFile());
    .then =>
      @compose()
    .then =>
      for file in @processed
        if file.wrapped?.special == 'start' && subStartFile = @makeSubStartFile(file)
          @push(subStartFile)
    .then =>
      for file in @processed
        unless file.wrapped?.special == 'end' || file.wrapped?.special == 'start'
          @push(file)