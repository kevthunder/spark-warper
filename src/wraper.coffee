through = require('through2')
path = require('path');
Promise = require('bluebird');


fn = {
  removeVarDef: (contents, vars, limit) ->
    if vars.length > 0 && limit > 0 && varsMatch = /^var\s+(([\w\d]+,\s*)+[\w\d]+)(;|\s*=)/.exec(contents.substring(0,limit))
      end = varsMatch[3]
      curVars = varsMatch[1].split(/,\s*/)
      if end != ';'
        end = curVars.pop() + end
      curVars = curVars.filter (varname)->
        !vars.includes(varname)
      if end != ';' && curVars.length > 0
        end = ', ' + end
      replace = 'var '+curVars.join(', ')+end
      if replace == 'var ;'
        replace = ''
      contents = contents.substring(0,varsMatch.index) + replace + contents.substring(varsMatch.index+varsMatch[0].length)
    contents

  extractDependencies: (contents) ->
    err = null
    dependencyLines = []
    startAt = null
    if (start = /(\/\/|\/\*+|###)\s*dependencies\s*(\*+\/|###)?/i.exec(contents)) && (end = /(\/\/|\/\*+|###)\s*end\s*dependencies\s*(\*+\/|###)?/i.exec(contents))
      dependencyLines = contents.substring(start.index+start[0].length,end.index).trim().split("\n")
      dependencyLines = dependencyLines.filter (line)->
        line.trim() != ''
      contents = contents.substring(0,start.index) + contents.substring(end.index+end[0].length)
      startAt = start.index
    else
      lines = contents.split("\n")
      i = 0
      loop
        line = lines[i]
        if match = line.match(/^((var|const)\s+)?(\w+)\s*=.*require.*$/)
          if dependencyLines.length == 0
            startAt = lines.slice(0,i).join("\n").length
          dependencyLines.push(line)
          lines.splice(i,1)
        if line.trim() == ''
          match = true
          lines.splice(i,1)
        else
          i++
        break if i >= lines.length || (dependencyLines.length > 0 && !match)
      contents = lines.join("\n")
    dependencies = dependencyLines.map (line)->
      match = line.match(/^((var|const)\s+)?(\w+)\s*=\s*/)
      unless match?
        throw new Error('spark-wraper: malformated dependency :'+line)
      {
          name: match[3]
          def: line.substring(match[0].length)
      }
    contents = fn.removeVarDef(contents,dependencies.map((dep)->dep.name),startAt)
    {contents:contents, dependencies:dependencies}

  replaceOptions: (options, contents) ->
    contents.replace(/\{\{className\}\}/g,options.className).replace(/\{\{namespace\}\}/g,options.namespace)

  wrap: (options, contents) ->
    dependencies = []
    Promise.resolve().then ->
      res = fn.extractDependencies(contents)
      contents = res.contents
      dependencies = res.dependencies
    .then ->
      before = '(function(definition){
          {{className}} = definition(typeof({{namespace}}) !== "undefined"?{{namespace}}:this.{{namespace}});
          {{className}}.definition = definition;
          if (typeof(module) !== "undefined" && module !== null) {
            module.exports = {{className}};
          } else {
            if (typeof({{namespace}}) !== "undefined" && {{namespace}} !== null) {
              {{namespace}}.{{className}} = {{className}};
            } else{
              if (this.{{namespace}} == null) {
                this.{{namespace}} = {};
              }
              this.{{namespace}}.{{className}} = {{className}};
            }
          }
        })(
      '
      before = fn.replaceOptions(options,before).replace(/\s/g,'')
      if dependencies.length
        before += 'function(dependencies){if(dependencies==null){dependencies={};}'
        for dependency in dependencies
          before += '\nvar {{name}} = dependencies.hasOwnProperty("{{name}}") ? dependencies.{{name}} : {{def}}'
            .replace(/\{\{name\}\}/g,dependency.name).replace(/\{\{def\}\}/g,dependency.def)
      else
        before += 'function(){'

      after = fn.replaceOptions(options,'
          return({{className}});
        });
      ').replace(/\s/g,'')
      before + '\n' + contents + '\n' + after

  doWrap: (options,wrap) ->
    (file, enc, callback) ->
      stream = this
      localOpt = Object.assign({},options)
      isStream = file.contents and typeof file.contents.on == 'function' and typeof file.contents.pipe == 'function'
      isBuffer = file.contents instanceof Buffer
      if !localOpt?.namespace?
        callback(new Error('spark-wraper: namespace needed'), file)
      if isStream
        callback(new Error('spark-wraper: Streaming not supported'), file)
      else if isBuffer
        unless localOpt.className?
          localOpt.className = path.basename(file.path,path.extname(file.path))
        wrap(localOpt, String(file.contents)).then (contents)->
          file.contents = new Buffer(contents)
          file
        .asCallback(callback)
      else
        callback null, file
}

class Composer
  constructor: (options)->
    @options = Object.assign({},options)
    @files = []
    @processed = []
  collect: (file, stream)->
    @files.push(file)
    Promise.resolve()
  processFile: (file, stream)->
    index = @files.indexOf(file)
    if index > -1
      @wrapFile(file, stream).then (file)=>
        @files.splice(index, 1)
        stream.push(file)
        @processed.push(file)
        file
    else
      Promise.reject(new Error('this file is not in the stream'))
  getProcessedFile: (path, stream)->
    Promise.resolve().then =>
      if file = @files.find((file)->file.path == path)
        @processFile(file,stream)
      else if file = @processed.find((file)->file.path == path)
        file
  resolveDependency: (dependency, file, stream)->
    Promise.resolve().then =>
      if match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)
        dependencyPath = path.resolve(path.dirname(file.path)+'/'+match[2]+path.extname(file.path))
        @getProcessedFile(dependencyPath, stream).then (dependencyFile)=>
          if dependencyFile
            dependency.def = dependency.def.replace(match[0],dependencyFile.wraped.namespace+'.'+dependencyFile.wraped.className)
    .then =>
      fn.replaceOptions(@options,'\n  {{name}} = if dependencies.hasOwnProperty("{{name}}") then dependencies.{{name}} else {{def}}'
        .replace(/\{\{def\}\}/g,dependency.def).replace(/\{\{name\}\}/g,dependency.name))
  wrapFile: (file, stream)->
    Promise.resolve().then =>
      unless file.wraped?
        file.wraped = {
          className: path.basename(file.path,path.extname(file.path))
          namespace: @options.namespace
        }
        contents = String(file.contents)
        res = fn.extractDependencies(contents)
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
        before = fn.replaceOptions(file.wraped,before)

        Promise.map(dependencies, (dependency)=>@resolveDependency(dependency,file, stream)).then (dependencies)=>
          for dependency in dependencies
            before += dependency


          after = fn.replaceOptions(file.wraped,"""
              {{className}}
            )
          """)

          contents = before + '\n' + contents.replace(/^/gm, "  ") + '\n' + after
          file.contents = new Buffer(contents)
    .then =>
      file
    

  compose: (stream)->
    if @files.length
      @processFile(@files[0],stream).then =>
        @compose(stream)
  getStream: ->
    _this = this
    through.obj (file, enc, cb) ->
      _this.collect(file,this).asCallback(cb)
    , (cb)->
      _this.compose(this).asCallback(cb)

module.exports = (options) ->
  through.obj fn.doWrap(options, fn.wrap)
module.exports.compose = (options) ->
  composer = new Composer(options)
  composer.getStream()
module.exports.fn = fn