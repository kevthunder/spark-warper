(function() {
  var es, fn, path;

  es = require('event-stream');

  path = require('path');

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
    extractDependencies: function(contents, cb) {
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
          return err = new Error('spark-wraper: malformated dependency :' + line);
        }
        return {
          name: match[3],
          def: line.substring(match[0].length)
        };
      });
      contents = fn.removeVarDef(contents, dependencies.map(function(dep) {
        return dep.name;
      }), startAt);
      return cb(err, contents, dependencies);
    },
    replaceOptions: function(options, contents) {
      return contents.replace(/\{\{className\}\}/g, options.className).replace(/\{\{namespace\}\}/g, options.namespace);
    },
    wrap: function(options, contents, cb) {
      return fn.extractDependencies(contents, function(err, contents, dependencies) {
        var after, before, dependency, j, len;
        if (err) {
          return cb(err);
        }
        before = fn.replaceOptions(options, '(function(definition){ {{className}} = definition(typeof({{namespace}}) !== "undefined"?{{namespace}}:this.{{namespace}}); {{className}}.definition = definition; if (typeof(module) !== "undefined" && module !== null) { module.exports = {{className}}; } else { if (typeof({{namespace}}) !== "undefined" && {{namespace}} !== null) { {{namespace}}.Tile.{{className}} = {{className}}; } else{ if (this.{{namespace}} == null) { this.{{namespace}} = {}; } this.{{namespace}}.Tile.{{className}} = {{className}}; } } })(function(dependencies) {if(dependencies==null){dependencies={};}').replace(/\s/g, '');
        for (j = 0, len = dependencies.length; j < len; j++) {
          dependency = dependencies[j];
          before += '\nvar {{name}} = dependencies.hasOwnProperty("{{name}}") ? dependencies.{{name}} : {{def}}'.replace(/\{\{name\}\}/g, dependency.name).replace(/\{\{def\}\}/g, dependency.def);
        }
        after = fn.replaceOptions(options, 'return({{className}}); });').replace(/\s/g, '');
        return cb(null, before + '\n' + contents + '\n' + after);
      });
    },
    wrapPart: function(options, contents, cb) {
      return fn.extractDependencies(contents, function(err, contents, dependencies) {
        var after, before, dependency, j, len;
        if (err) {
          return cb(err);
        }
        before = fn.replaceOptions(options, "((definition)->\n  {{namespace}}.{{className}} = definition({{namespace}})\n  {{namespace}}.{{className}}.definition = definition\n)((dependencies={})->");
        for (j = 0, len = dependencies.length; j < len; j++) {
          dependency = dependencies[j];
          before += '\n  {{name}} = dependencies.{{name}}'.replace(/\{\{name\}\}/g, dependency.name).replace(/\{\{def\}\}/g, dependency.def);
        }
        after = fn.replaceOptions(options, "  {{className}}\n)");
        return cb(null, before + '\n' + contents.replace(/^/gm, "  ") + '\n' + after);
      });
    },
    doWrap: function(options, wrap) {
      return function(file, callback) {
        var isBuffer, isStream, localOpt;
        localOpt = Object.assign({}, options);
        isStream = file.contents && typeof file.contents.on === 'function' && typeof file.contents.pipe === 'function';
        isBuffer = file.contents instanceof Buffer;
        if ((localOpt != null ? localOpt.namespace : void 0) == null) {
          callback(new Error('spark-wraper: namespace needed'), file);
        }
        if (isStream) {
          return callback(new Error('spark-wraper: Streaming not supported'), file);
        } else if (isBuffer) {
          if (localOpt.className == null) {
            localOpt.className = path.basename(file.path, path.extname(file.path));
          }
          return wrap(localOpt, String(file.contents), function(err, contents) {
            if (err) {
              return callback(err, file);
            }
            file.contents = new Buffer(contents);
            return callback(null, file);
          });
        } else {
          return callback(null, file);
        }
      };
    }
  };

  module.exports = function(options) {
    return es.map(fn.doWrap(options, fn.wrap));
  };

  module.exports.wrapPart = function(options) {
    return es.map(fn.doWrap(options, fn.wrapPart));
  };

  module.exports.fn = fn;

}).call(this);
