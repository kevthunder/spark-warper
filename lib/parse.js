(function() {
  var fn;

  fn = {
    removeVarDef: function(contents, vars, limit) {
      var curVars, end, replace, varsMatch;
      if (vars.length > 0 && limit > 0 && (varsMatch = /^var\s+(([\w\d]+,\s*)+[\w\d]+)(;|\s*=)/.exec(contents.substring(0, limit)))) {
        end = varsMatch[3];
        curVars = varsMatch[1].split(/,\s*/);
        if (end !== ';') {
          end = curVars.pop() + end;
        }
        curVars = curVars.filter(function(varname) {
          return !vars.includes(varname);
        });
        if (end !== ';' && curVars.length > 0) {
          end = ', ' + end;
        }
        replace = 'var ' + curVars.join(', ') + end;
        if (replace === 'var ;') {
          replace = '';
        }
        contents = contents.substring(0, varsMatch.index) + replace + contents.substring(varsMatch.index + varsMatch[0].length);
      }
      return contents;
    },
    extractDependencies: function(contents) {
      var dependencies, dependencyLines, end, err, i, line, lines, match, start, startAt;
      err = null;
      dependencyLines = [];
      startAt = null;
      if ((start = /(\/\/|\/\*+|###)\s*dependencies\s*(\*+\/|###)?/i.exec(contents)) && (end = /(\/\/|\/\*+|###)\s*end\s*dependencies\s*(\*+\/|###)?/i.exec(contents))) {
        dependencyLines = contents.substring(start.index + start[0].length, end.index).trim().split("\n");
        dependencyLines = dependencyLines.filter(function(line) {
          return line.trim() !== '';
        });
        contents = contents.substring(0, start.index) + contents.substring(end.index + end[0].length);
        startAt = start.index;
      } else {
        lines = contents.split("\n");
        i = 0;
        while (true) {
          line = lines[i];
          if (match = line.match(/^((var|const)\s+)?(\w+)\s*=.*require.*$/)) {
            if (dependencyLines.length === 0) {
              startAt = lines.slice(0, i).join("\n").length;
            }
            dependencyLines.push(line);
            lines.splice(i, 1);
          }
          if (line.trim() === '') {
            match = true;
            lines.splice(i, 1);
          } else {
            i++;
          }
          if (i >= lines.length || (dependencyLines.length > 0 && !match)) {
            break;
          }
        }
        contents = lines.join("\n");
      }
      dependencies = dependencyLines.map(function(line) {
        match = line.match(/^((var|const)\s+)?(\w+)\s*=\s*/);
        if (match == null) {
          throw new Error('spark-wraper: malformated dependency :' + line);
        }
        return {
          name: match[3],
          def: line.substring(match[0].length)
        };
      });
      contents = fn.removeVarDef(contents, dependencies.map(function(dep) {
        return dep.name;
      }), startAt);
      return {
        contents: contents,
        dependencies: dependencies
      };
    },
    replaceOptions: function(options, contents) {
      return contents.replace(/\{\{className\}\}/g, options.className).replace(/\{\{namespace\}\}/g, options.namespace);
    }
  };

  module.exports = fn;

}).call(this);
