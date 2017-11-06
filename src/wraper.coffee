es = require('event-stream')
path = require('path');


fn = {
  removeVarDef: (contents, vars, limit) ->
    if vars.length > 0 && limit > 0 && varsMatch = /^var\s+(([\w\d]+,\s*)+[\w\d]+)(;|\s*=)/.exec(contents.substring(0,limit))
      end = varsMatch[3]
      curVars = varsMatch[1].split(/,\s*/)
      if end != ';'
        end = curVars.pop() + end
      console.log(curVars)
      curVars = curVars.filter (varname)->
        !vars.includes(varname)
      if end != ';' && curVars.length > 0
        end = ', ' + end
      replace = 'var '+curVars.join(', ')+end
      if replace == 'var ;'
        replace = ''
      contents = contents.substring(0,varsMatch.index) + replace + contents.substring(varsMatch.index+varsMatch[0].length)
    contents
  extractDependencies: (contents, cb) ->
    err = null
    dependencyLines = []
    startAt = null
    if (start = /(\/\/|\/\*+)\s*dependencies\s*(\*+\/)?/i.exec(contents)) && (end = /(\/\/|\/\*+)\s*end\s*dependencies\s*(\*+\/)?/i.exec(contents))
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
            startAt = line.slice(0,i).join("\n").length
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
        return err = new Error('spark-wraper: malformated dependency :'+line)
      {
          name: match[3]
          def: line.substring(match[0].length)
      }
    contents = fn.removeVarDef(contents,dependencies.map((dep)->dep.name),startAt)
    cb(err,contents,dependencies)
  wrap: (options, contents, cb) ->
    fn.extractDependencies contents, (err, contents,dependencies)->
      if err
        return cb(err)
      before = 'definition = function(dependencies) {'
      for dependency in dependencies
        before += 'var {{name}} = dependencies != null && dependencies.{{name}} == null ? dependencies.{{name}} : {{def}}'
          .replace(/\{\{name\}\}/g,dependency.name).replace(/\{\{def\}\}/g,dependency.def)
      after = '
        {{className}} = definition({{namespace}} || this.{{namespace}});
        {{className}}.definition = definition;
        if (typeof({{namespace}}) !== "undefined" && {{namespace}} !== null) {
          {{namespace}}.Tile.{{className}} = {{className}};
        }
        if (typeof(module) !== "undefined" && module !== null) {
          module.exports = {{className}};
        } else {
          if (this.{{namespace}} == null) {
            this.{{namespace}} = {};
          }
          this.{{namespace}}.Tile.{{className}} = {{className}};
        }
      '.replace(/\{\{className\}\}/g,options.className).replace(/\{\{namespace\}\}/g,options.namespace).replace(/\s/g,'')
      cb(null, before + '\n' + contents + '\n' + after)

  doWrap: (options) ->
    (file, callback) ->
      isStream = file.contents and typeof file.contents.on == 'function' and typeof file.contents.pipe == 'function'
      isBuffer = file.contents instanceof Buffer
      if !options?.namespace?
        callback(new Error('spark-wraper: namespace needed'), file)
      if isStream
        callback(new Error('spark-wraper: Streaming not supported'), file)
      else if isBuffer
        unless options.className?
          options.className = path.basename(file.path,'.js')
        fn.wrap options, String(file.contents), (err, contents)->
          if err
            return callback(err, file)
          file.contents = new Buffer(contents)
          callback(null, file)
      else
        callback null, file
}

module.exports = (options) ->
  es.map fn.doWrap(options)
module.exports.fn = fn