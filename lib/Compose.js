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
      var index;
      index = this.files.indexOf(file);
      if (index > -1) {
        return this.wrapFile(file).then((function(_this) {
          return function(file) {
            _this.files.splice(index, 1);
            _this.push(file);
            _this.processed.push(file);
            return file;
          };
        })(this));
      } else {
        return Promise.reject(new Error('this file is not in the stream'));
      }
    };

    Compose.prototype.getProcessedFile = function(path) {
      return Promise.resolve().then((function(_this) {
        return function() {
          var file;
          if (file = _this.files.find(function(file) {
            return file.path === path;
          })) {
            return _this.processFile(file);
          } else if (file = _this.processed.find(function(file) {
            return file.path === path;
          })) {
            return file;
          }
        };
      })(this));
    };

    Compose.prototype.resolveDependency = function(dependency, file) {
      return Promise.resolve().then((function(_this) {
        return function() {
          var dependencyPath, match;
          if (match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)) {
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
            file.wraped = {
              className: path.basename(file.path, path.extname(file.path)),
              namespace: _this.opt.namespace
            };
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
          return _this.push(new gutil.File({
            cwd: "",
            base: _this.getBase(),
            path: path.join(_this.getBase(), '_start.coffee'),
            contents: new Buffer(_this.opt.namespace + '={}')
          }));
        };
      })(this)).then((function(_this) {
        return function() {
          return _this.compose();
        };
      })(this)).then((function(_this) {
        return function() {
          var contents;
          contents = "if module?\n  module.exports = {{namespace}}\nelse \n  @{{namespace}} = {{namespace}}";
          contents = parse.replaceOptions(_this.opt, contents);
          return _this.push(new gutil.File({
            cwd: "",
            base: _this.getBase(),
            path: path.join(_this.getBase(), '_end.coffee'),
            contents: new Buffer(contents)
          }));
        };
      })(this));
    };

    return Compose;

  })(Stream);

}).call(this);
