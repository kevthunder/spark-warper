(function() {
  var Compose, Promise, Stream, gutil, parse, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Promise = require('bluebird');

  path = require('path');

  gutil = require('gulp-util');

  Stream = require('./Stream');

  parse = require('./parse');

  module.exports = Compose = (function(superClass) {
    extend(Compose, superClass);

    function Compose(options) {
      this.opt = Object.assign({}, options);
      this.files = [];
      this.processed = [];
      Compose.__super__.constructor.call(this);
    }

    Compose.prototype.getBase = function() {
      if (!this._base) {
        this._base = this.files[this.files.length - 1].base;
      }
      return this._base;
    };

    Compose.prototype.processFile = function(file) {
      if (this.files.includes(file)) {
        return this.wrapFile(file).then((function(_this) {
          return function(file) {
            var index;
            index = _this.files.indexOf(file);
            if (index > -1) {
              _this.files.splice(index, 1);
              _this.processed.push(file);
            }
            return file;
          };
        })(this));
      } else {
        return Promise.reject(new Error('this file is not in the stream'));
      }
    };

    Compose.prototype.getProcessedFile = function(path) {
      var find;
      find = function(file) {
        return file.path === path;
      };
      return Promise.resolve().then((function(_this) {
        return function() {
          var file;
          if (file = _this.files.find(find)) {
            return _this.processFile(file);
          } else if (file = _this.processed.find(find)) {
            return file;
          }
        };
      })(this));
    };

    Compose.prototype.getProcessedByRef = function(module, ref) {
      var find;
      find = function(file) {
        var ref1;
        return ((ref1 = file.wraped) != null ? ref1.module : void 0) === module && ref.indexOf(file.wraped.className) === 0;
      };
      return Promise.resolve().then((function(_this) {
        return function() {
          var file;
          if (file = _this.files.find(find)) {
            return _this.processFile(file);
          } else if (file = _this.processed.find(find)) {
            return file;
          }
        };
      })(this));
    };

    Compose.prototype.resolveDependency = function(dependency, file) {
      return Promise.resolve().then((function(_this) {
        return function() {
          var dependencyPath, match, module, ref;
          if (match = /require\(['"]([-_\d\w]+)['"]\)((.[_\d\w])+)/.exec(dependency.def)) {
            module = match[1];
            ref = match[2].substring(1);
            return _this.getProcessedByRef(module, ref).then(function(dependencyFile) {
              if (dependencyFile) {
                return dependency.def = dependency.def.replace(match[0], dependencyFile.wraped.namespace + '.' + dependencyFile.wraped.className);
              }
            });
          } else if (match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)) {
            dependencyPath = path.resolve(path.dirname(file.path) + '/' + match[2] + path.extname(file.path));
            return _this.getProcessedFile(dependencyPath).then(function(dependencyFile) {
              if (dependencyFile) {
                return dependency.def = dependency.def.replace(match[0], dependencyFile.wraped.namespace + '.' + dependencyFile.wraped.className);
              }
            });
          }
        };
      })(this)).then((function(_this) {
        return function() {
          return parse.replaceOptions(_this.opt, '\n  {{name}} = if dependencies.hasOwnProperty("{{name}}") then dependencies.{{name}} else {{def}}'.replace(/\{\{def\}\}/g, dependency.def).replace(/\{\{name\}\}/g, dependency.name));
        };
      })(this));
    };

    Compose.prototype.wrapFile = function(file) {
      return Promise.resolve().then((function(_this) {
        return function() {
          var before, contents, dependencies, res;
          if (file.wraped == null) {
            _this.addFileOptions(file);
            contents = String(file.contents);
            res = parse.extractDependencies(contents);
            contents = res.contents;
            dependencies = res.dependencies;
            before = "((definition)->\n  {{namespace}}.{{className}} = definition()\n  {{namespace}}.{{className}}.definition = definition\n)(";
            if (dependencies.length) {
              before += '(dependencies={})->';
            } else {
              before += '->';
            }
            before = parse.replaceOptions(file.wraped, before);
            return Promise.map(dependencies, function(dependency) {
              return _this.resolveDependency(dependency, file);
            }).then(function(dependencies) {
              var after, dependency, i, len;
              for (i = 0, len = dependencies.length; i < len; i++) {
                dependency = dependencies[i];
                before += dependency;
              }
              after = parse.replaceOptions(file.wraped, "  {{className}}\n)");
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

    Compose.prototype.addFileOptions = function(file) {
      var options;
      options = Object.assign({}, this.opt, {
        className: path.basename(file.path, path.extname(file.path))
      });
      return file.wraped = options;
    };

    Compose.prototype.compose = function() {
      if (this.files.length) {
        return this.processFile(this.files[0]).then((function(_this) {
          return function() {
            return _this.compose();
          };
        })(this));
      }
    };

    Compose.prototype.transform = Compose.prototype.collect;

    Compose.prototype.flush = function() {
      return Promise.resolve().then((function(_this) {
        return function() {
          var file;
          file = new gutil.File({
            cwd: "",
            base: _this.getBase(),
            path: path.join(_this.getBase(), '_start.coffee'),
            contents: new Buffer(_this.opt.namespace + '={}')
          });
          file.wraped = Object.assign({
            special: 'start'
          }, _this.opt);
          return _this.push(file);
        };
      })(this)).then((function(_this) {
        return function() {
          return _this.compose();
        };
      })(this)).then((function(_this) {
        return function() {
          var file, i, j, len, len1, ref1, ref2, ref3, ref4, ref5, results;
          ref1 = _this.processed;
          for (i = 0, len = ref1.length; i < len; i++) {
            file = ref1[i];
            if (((ref2 = file.wraped) != null ? ref2.special : void 0) === 'start' && file.wraped.namespace !== _this.opt.namespace) {
              _this.push(file);
            }
          }
          ref3 = _this.processed;
          results = [];
          for (j = 0, len1 = ref3.length; j < len1; j++) {
            file = ref3[j];
            if (!(((ref4 = file.wraped) != null ? ref4.special : void 0) === 'end' || ((ref5 = file.wraped) != null ? ref5.special : void 0) === 'start')) {
              results.push(_this.push(file));
            } else {
              results.push(void 0);
            }
          }
          return results;
        };
      })(this)).then((function(_this) {
        return function() {
          var contents, file;
          contents = "if module?\n  module.exports = {{namespace}}\nelse \n  @{{namespace}} = {{namespace}}";
          contents = parse.replaceOptions(_this.opt, contents);
          file = new gutil.File({
            cwd: "",
            base: _this.getBase(),
            path: path.join(_this.getBase(), '_end.coffee'),
            contents: new Buffer(contents)
          });
          file.wraped = {
            special: 'end'
          };
          return _this.push(file);
        };
      })(this));
    };

    return Compose;

  })(Stream);

}).call(this);
