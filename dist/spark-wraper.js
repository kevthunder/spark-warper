(function() {
  var Composer, Promise, fn, path, through;

  through = require('through2');

  path = require('path');

  Promise = require('bluebird');

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
    },
    wrap: function(options, contents) {
      var dependencies;
      dependencies = [];
      return Promise.resolve().then(function() {
        var res;
        res = fn.extractDependencies(contents);
        contents = res.contents;
        return dependencies = res.dependencies;
      }).then(function() {
        var after, before, dependency, j, len;
        before = '(function(definition){ {{className}} = definition(typeof({{namespace}}) !== "undefined"?{{namespace}}:this.{{namespace}}); {{className}}.definition = definition; if (typeof(module) !== "undefined" && module !== null) { module.exports = {{className}}; } else { if (typeof({{namespace}}) !== "undefined" && {{namespace}} !== null) { {{namespace}}.Tile.{{className}} = {{className}}; } else{ if (this.{{namespace}} == null) { this.{{namespace}} = {}; } this.{{namespace}}.Tile.{{className}} = {{className}}; } } })(';
        before = fn.replaceOptions(options, before).replace(/\s/g, '');
        if (dependencies.length) {
          before += 'function(dependencies){if(dependencies==null){dependencies={};}';
          for (j = 0, len = dependencies.length; j < len; j++) {
            dependency = dependencies[j];
            before += '\nvar {{name}} = dependencies.hasOwnProperty("{{name}}") ? dependencies.{{name}} : {{def}}'.replace(/\{\{name\}\}/g, dependency.name).replace(/\{\{def\}\}/g, dependency.def);
          }
        } else {
          before += 'function(){';
        }
        after = fn.replaceOptions(options, 'return({{className}}); });').replace(/\s/g, '');
        return before + '\n' + contents + '\n' + after;
      });
    },
    doWrap: function(options, wrap) {
      return function(file, enc, callback) {
        var isBuffer, isStream, localOpt, stream;
        stream = this;
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
          return wrap(localOpt, String(file.contents)).then(function(contents) {
            file.contents = new Buffer(contents);
            return file;
          }).asCallback(callback);
        } else {
          return callback(null, file);
        }
      };
    }
  };

  Composer = (function() {
    function Composer(options) {
      this.options = Object.assign({}, options);
      this.files = [];
      this.processed = [];
    }

    Composer.prototype.collect = function(file, stream) {
      this.files.push(file);
      return Promise.resolve();
    };

    Composer.prototype.processFile = function(file, stream) {
      var index;
      index = this.files.indexOf(file);
      if (index > -1) {
        return this.wrapFile(file, stream).then((function(_this) {
          return function(file) {
            _this.files.splice(index, 1);
            stream.push(file);
            _this.processed.push(file);
            return file;
          };
        })(this));
      } else {
        return Promise.reject(new Error('this file is not in the stream'));
      }
    };

    Composer.prototype.getProcessedFile = function(path, stream) {
      return Promise.resolve().then((function(_this) {
        return function() {
          var file;
          if (file = _this.files.find(function(file) {
            return file.path === path;
          })) {
            return _this.processFile(file, stream);
          } else if (file = _this.processed.find(function(file) {
            return file.path === path;
          })) {
            return file;
          }
        };
      })(this));
    };

    Composer.prototype.resolveDependency = function(dependency, file, stream) {
      return Promise.resolve().then((function(_this) {
        return function() {
          var dependencyPath, match;
          if (match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)) {
            dependencyPath = path.resolve(path.dirname(file.path) + '/' + match[2] + path.extname(file.path));
            return _this.getProcessedFile(dependencyPath, stream).then(function(dependencyFile) {
              if (dependencyFile) {
                return dependency.def = dependency.def.replace(match[0], dependencyFile.wraped.namespace + '.' + dependencyFile.wraped.className);
              }
            });
          }
        };
      })(this)).then((function(_this) {
        return function() {
          return fn.replaceOptions(_this.options, '\n  {{name}} = if dependencies.hasOwnProperty("{{name}}") then dependencies.{{name}} else {{def}}'.replace(/\{\{def\}\}/g, dependency.def).replace(/\{\{name\}\}/g, dependency.name));
        };
      })(this));
    };

    Composer.prototype.wrapFile = function(file, stream) {
      return Promise.resolve().then((function(_this) {
        return function() {
          var before, contents, dependencies, res;
          if (file.wraped == null) {
            file.wraped = {
              className: path.basename(file.path, path.extname(file.path)),
              namespace: _this.options.namespace
            };
            contents = String(file.contents);
            res = fn.extractDependencies(contents);
            contents = res.contents;
            dependencies = res.dependencies;
            before = "((definition)->\n  {{namespace}}.{{className}} = definition()\n  {{namespace}}.{{className}}.definition = definition\n)(";
            if (dependencies.length) {
              before += '(dependencies={})->';
            } else {
              before += '->';
            }
            before = fn.replaceOptions(file.wraped, before);
            return Promise.map(dependencies, function(dependency) {
              return _this.resolveDependency(dependency, file, stream);
            }).then(function(dependencies) {
              var after, dependency, j, len;
              for (j = 0, len = dependencies.length; j < len; j++) {
                dependency = dependencies[j];
                before += dependency;
              }
              after = fn.replaceOptions(file.wraped, "  {{className}}\n)");
              contents = before + '\n' + contents.replace(/^/gm, "  ") + '\n' + after;
              return file.contents = new Buffer(contents);
            });
          }
        };
      })(this)).then((function(_this) {
        return function() {
          return file;
        };
      })(this));
    };

    Composer.prototype.compose = function(stream) {
      if (this.files.length) {
        return this.processFile(this.files[0], stream).then((function(_this) {
          return function() {
            return _this.compose(stream);
          };
        })(this));
      }
    };

    Composer.prototype.getStream = function() {
      var _this;
      _this = this;
      return through.obj(function(file, enc, cb) {
        return _this.collect(file, this).asCallback(cb);
      }, function(cb) {
        return _this.compose(this).asCallback(cb);
      });
    };

    return Composer;

  })();

  module.exports = function(options) {
    return through.obj(fn.doWrap(options, fn.wrap));
  };

  module.exports.compose = function(options) {
    var composer;
    composer = new Composer(options);
    return composer.getStream();
  };

  module.exports.fn = fn;

}).call(this);
