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
      this.opt = this.parseOptions(options);
      this.files = [];
      this.processed = [];
      Compose.__super__.constructor.call(this);
    }

    Compose.prototype.parseOptions = function(options) {
      var opt;
      opt = Object.assign({
        exclude: /^_/
      }, options);
      if (opt.varname == null) {
        opt.varname = opt.module ? opt.namespace : opt.namespace.split('.').pop();
      }
      return opt;
    };

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
      } else if (this.processed.includes(file)) {
        return Promise.resolve(file);
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
      if (ref == null) {
        ref = null;
      }
      find = function(file) {
        var ref1;
        return ((ref1 = file.wrapped) != null ? ref1.module : void 0) === module && (ref === null ? (file.wrapped.className != null) && file.wrapped.className === file.wrapped.main : ref.indexOf(file.wrapped.className) === 0);
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

    Compose.prototype.getSingletonModule = function(module) {
      var find;
      find = function(file) {
        var ref1;
        return ((ref1 = file.wrapped) != null ? ref1.module : void 0) === module && (file.wrapped.className != null) && file.wrapped.className === file.wrapped.main;
      };
      return this.files.find(find) || this.processed.find(find);
    };

    Compose.prototype.resolveDependency = function(dependency, file) {
      var match;
      match = null;
      return Promise.resolve().then((function(_this) {
        return function() {
          var dependencyPath, found, module, ref, singleton;
          if ((_this.opt.aliases != null) && (match = /require(\(|\s*)['"](\.\/)?([^'"]+)['"]\)?/.exec(dependency.def)) && (found = _this.opt.aliases[match[3]])) {
            dependency.def = dependency.def.replace(match[0], found);
            return null;
          } else if ((match = /require\(['"]([-_\d\w]+)['"]\)/.exec(dependency.def)) && (singleton = _this.getSingletonModule(match[1]))) {
            return _this.processFile(singleton);
          } else if (match = /require\(['"]([-_\d\w]+)['"]\)((\.[_\d\w]+)+)/.exec(dependency.def)) {
            module = match[1];
            ref = match[2].substring(1);
            return _this.getProcessedByRef(module, ref);
          } else if (match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)) {
            dependencyPath = path.resolve(path.dirname(file.path) + '/' + match[2] + path.extname(file.path));
            return _this.getProcessedFile(dependencyPath);
          }
        };
      })(this)).then((function(_this) {
        return function(dependencyFile) {
          if (dependencyFile) {
            dependency.def = dependency.def.replace(match[0], dependencyFile.wrapped.varname + '.' + dependencyFile.wrapped.className);
            if (!file.wrapped.dependencies) {
              file.wrapped.dependencies = [];
            }
            return file.wrapped.dependencies.push(dependencyFile.path);
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
          if (file.wrapped != null) {
            if (file.wrapped.dependencies) {
              return Promise.all(file.wrapped.dependencies.map(function(dependency) {
                return _this.getProcessedFile(dependency);
              }));
            }
          } else if (!path.basename(file.path).match(_this.opt.exclude)) {
            _this.addFileOptions(file);
            contents = String(file.contents);
            res = parse.extractDependencies(contents);
            contents = res.contents;
            dependencies = res.dependencies;
            before = "((definition)->\n  {{varname}}.{{className}} = definition()\n  {{varname}}.{{className}}.definition = definition\n)(";
            if (dependencies.length) {
              before += '(dependencies={})->';
            } else {
              before += '->';
            }
            before = parse.replaceOptions(file.wrapped, before);
            return Promise.map(dependencies, function(dependency) {
              return _this.resolveDependency(dependency, file);
            }).then(function(dependencies) {
              var after, dependency, i, len;
              for (i = 0, len = dependencies.length; i < len; i++) {
                dependency = dependencies[i];
                before += dependency;
              }
              after = parse.replaceOptions(file.wrapped, "  {{className}}\n)");
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
      return file.wrapped = options;
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

    Compose.prototype.makeNamespaceCreator = function(namespace, prefix, indent) {
      var createNamespace, i, len, part, parts;
      if (prefix == null) {
        prefix = '';
      }
      if (indent == null) {
        indent = '';
      }
      parts = namespace.split('.');
      createNamespace = '';
      for (i = 0, len = parts.length; i < len; i++) {
        part = parts[i];
        createNamespace += "\n" + indent + "unless " + prefix + part + "?";
        createNamespace += "\n" + indent + "   " + prefix + part + " = {}";
        prefix += part + '.';
      }
      return createNamespace;
    };

    Compose.prototype.makeStartFile = function() {
      var afterParent, contents, file;
      if (this.opt.partOf != null) {
        if (this.opt.partOf === this.opt.namespace) {
          contents = "{{varname}} = if module?\n  module.exports\nelse\n  @{{namespace}}";
        } else {
          contents = "{{varname}} = if module?\n  {{parentVarname}} = module.exports\n  {{createSubNamespace}}\n  {{parentVarname}}.{{afterParent}}\nelse\n  {{parentVarname}} = @{{partOf}}\n  {{createNamespace}}\n  @{{namespace}}";
          afterParent = this.opt.namespace.substring(this.opt.partOf.length + 1);
          contents = contents.replace(/\{\{partOf\}\}/g, this.opt.partOf);
          contents = contents.replace(/\{\{parentVarname\}\}/g, this.opt.partOf.split('.').pop());
          contents = contents.replace(/\{\{afterParent\}\}/g, afterParent);
          contents = contents.replace(/\{\{createSubNamespace\}\}/g, this.makeNamespaceCreator(afterParent, this.opt.partOf + '.', '  '));
          contents = contents.replace(/\{\{createNamespace\}\}/g, this.makeNamespaceCreator(this.opt.namespace.substring(this.opt.partOf.length + 1), '@' + this.opt.partOf + '.', '  '));
        }
      } else {
        contents = "{{varname}} = if module?\n  module.exports =  {}\nelse\n  {{createNamespace}}\n  @{{namespace}}";
        contents = contents.replace(/\{\{createNamespace\}\}/g, this.makeNamespaceCreator(this.opt.namespace, '@', '  '));
      }
      contents = parse.replaceOptions(this.opt, contents);
      file = new gutil.File({
        cwd: "",
        base: this.getBase(),
        path: path.join(this.getBase(), '_start.coffee'),
        contents: new Buffer(contents)
      });
      file.wrapped = Object.assign({
        special: 'start'
      }, this.opt);
      return file;
    };

    Compose.prototype.makeSubStartFile = function(file) {
      var contents;
      if (file.wrapped.namespace === this.opt.namespace) {
        return null;
      } else if (file.wrapped.namespace.indexOf(this.opt.namespace + '.') === 0) {
        contents = "{{createNamespace}}";
        contents = contents.replace(/\{\{createNamespace\}\}/g, this.makeNamespaceCreator(file.wrapped.namespace.substring(this.opt.namespace.length + 1), this.opt.namespace + '.'));
        contents = parse.replaceOptions(file.wrapped, contents);
        file.contents = new Buffer(contents);
        return file;
      } else {
        return file;
      }
    };

    Compose.prototype.flush = function() {
      return Promise.resolve().then((function(_this) {
        return function() {
          return _this.push(_this.makeStartFile());
        };
      })(this)).then((function(_this) {
        return function() {
          return _this.compose();
        };
      })(this)).then((function(_this) {
        return function() {
          var file, i, len, ref1, ref2, results, subStartFile;
          ref1 = _this.processed;
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            file = ref1[i];
            if (((ref2 = file.wrapped) != null ? ref2.special : void 0) === 'start' && (subStartFile = _this.makeSubStartFile(file))) {
              results.push(_this.push(subStartFile));
            } else {
              results.push(void 0);
            }
          }
          return results;
        };
      })(this)).then((function(_this) {
        return function() {
          var file, i, len, ref1, ref2, ref3, results;
          ref1 = _this.processed;
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            file = ref1[i];
            if (!(((ref2 = file.wrapped) != null ? ref2.special : void 0) === 'end' || ((ref3 = file.wrapped) != null ? ref3.special : void 0) === 'start')) {
              results.push(_this.push(file));
            } else {
              results.push(void 0);
            }
          }
          return results;
        };
      })(this));
    };

    return Compose;

  })(Stream);

}).call(this);
