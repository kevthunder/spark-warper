fn = 
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
        if match = line.match(/^\s*((var|const)\s+)?(\w+)\s*=.*require.*\s*$/)
          if dependencyLines.length == 0
            startAt = lines.slice(0,i).join("\n").length
          dependencyLines.push(line)
          lines.splice(i,1)
        else if line.trim() == ''
          match = true
          lines.splice(i,1)
        else
          i++
        break if i >= lines.length || (dependencyLines.length > 0 && !match)
      contents = lines.join("\n")
    dependencies = dependencyLines.map (line)->
      match = line.match(/^((var|const)\s+)?(\w+)\s*=\s*/)
      unless match?
        throw new Error('spark-wrapper: malformated dependency :'+line)
      {
          name: match[3]
          def: line.substring(match[0].length)
      }
    contents = fn.removeVarDef(contents,dependencies.map((dep)->dep.name),startAt)
    {contents:contents, dependencies:dependencies}

  replaceOptions: (options, contents) ->
    contents.replace(/\{\{className\}\}/g,options.className).replace(/\{\{namespace\}\}/g,options.namespace)

module.exports = fn