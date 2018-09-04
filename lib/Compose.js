(function() {
  var Compose, Promise, Stream, gutil, parse, path;

  Promise = require('bluebird');

  path = require('path');

  gutil = require('gulp-util');

  Stream = require('./Stream');

  parse = require('./parse');

  module.exports = Compose = (function() {
    class Compose extends Stream {
      constructor(options) {
        super();
        this.opt = this.parseOptions(options);
        this.files = [];
        this.processed = [];
      }

      parseOptions(options) {
        var opt;
        opt = Object.assign({
          exclude: /^_/
        }, options);
        if (opt.varname == null) {
          opt.varname = opt.module ? opt.namespace : opt.namespace.split('.').pop();
        }
        return opt;
      }

      getBase() {
        if (!this._base) {
          this._base = this.files[this.files.length - 1].base;
        }
        return this._base;
      }

      processFile(file) {
        if (this.files.includes(file)) {
          return this.wrapFile(file).then((file) => {
            var index;
            index = this.files.indexOf(file);
            if (index > -1) {
              this.files.splice(index, 1);
              this.processed.push(file);
            }
            return file;
          });
        } else if (this.processed.includes(file)) {
          return Promise.resolve(file);
        } else {
          return Promise.reject(new Error('this file is not in the stream'));
        }
      }

      getProcessedFile(path) {
        var find;
        find = function(file) {
          return file.path === path;
        };
        return Promise.resolve().then(() => {
          var file;
          if (file = this.files.find(find)) {
            return this.processFile(file);
          } else if (file = this.processed.find(find)) {
            return file;
          }
        });
      }

      getProcessedByRef(module, ref) {
        var find;
        find = function(file) {
          var ref1;
          return ((ref1 = file.wrapped) != null ? ref1.module : void 0) === module && (ref === file.wrapped.className || ref.indexOf(file.wrapped.className + '.') === 0);
        };
        return Promise.resolve().then(() => {
          var file;
          if (file = this.files.find(find)) {
            return this.processFile(file);
          } else if (file = this.processed.find(find)) {
            return file;
          }
        });
      }

      getSingletonModule(module) {
        var find;
        find = function(file) {
          var ref1;
          return ((ref1 = file.wrapped) != null ? ref1.module : void 0) === module && (file.wrapped.className != null) && file.wrapped.className === file.wrapped.main;
        };
        return this.files.find(find) || this.processed.find(find);
      }

      resolveDependency(dependency, file) {
        var match;
        match = null;
        return Promise.resolve().then(() => {
          var dependencyPath, found, module, ref, singleton;
          if ((this.opt.aliases != null) && (match = /require(\(|\s*)['"](\.\/)?([^'"]+)['"]\)?/.exec(dependency.def)) && (found = this.opt.aliases[match[3]])) {
            dependency.def = dependency.def.replace(match[0], found);
            return null;
          } else if ((match = /require\(['"]([-_\d\w]+)['"]\)/.exec(dependency.def)) && (singleton = this.getSingletonModule(match[1]))) {
            return this.processFile(singleton);
          } else if (match = /require\(['"]([-_\d\w]+)['"]\)((\.[_\d\w]+)+)/.exec(dependency.def)) {
            module = match[1];
            ref = match[2].substring(1);
            return this.getProcessedByRef(module, ref);
          } else if (match = /require(\(|\s*)['"]([^'"]+)['"]\)?/.exec(dependency.def)) {
            dependencyPath = path.resolve(path.dirname(file.path) + '/' + match[2] + path.extname(file.path));
            return this.getProcessedFile(dependencyPath);
          }
        }).then((dependencyFile) => {
          if (dependencyFile) {
            dependency.def = dependency.def.replace(match[0], dependencyFile.wrapped.varname + '.' + dependencyFile.wrapped.className);
            if (!file.wrapped.dependencies) {
              file.wrapped.dependencies = [];
            }
            return file.wrapped.dependencies.push(dependencyFile.path);
          }
        }).then(() => {
          return parse.replaceOptions(this.opt, '\n  {{name}} = if dependencies.hasOwnProperty("{{name}}") then dependencies.{{name}} else {{def}}'.replace(/\{\{def\}\}/g, dependency.def).replace(/\{\{name\}\}/g, dependency.name));
        });
      }

      wrapFile(file) {
        return Promise.resolve().then(() => {
          var before, contents, dependencies, res;
          if (file.wrapped != null) {
            if (file.wrapped.dependencies) {
              return Promise.all(file.wrapped.dependencies.map((dependency) => {
                return this.getProcessedFile(dependency);
              }));
            }
          } else if (!path.basename(file.path).match(this.opt.exclude)) {
            this.addFileOptions(file);
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
            return Promise.map(dependencies, (dependency) => {
              return this.resolveDependency(dependency, file);
            }).then((dependencies) => {
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
        }).then(() => {
          return file;
        });
      }

      addFileOptions(file) {
        var options;
        options = Object.assign({}, this.opt, {
          className: path.basename(file.path, path.extname(file.path))
        });
        return file.wrapped = options;
      }

      compose() {
        if (this.files.length) {
          return this.processFile(this.files[0]).then(() => {
            return this.compose();
          });
        }
      }

      makeNamespaceCreator(namespace, prefix = '', indent = '') {
        var createNamespace, i, len, part, parts;
        parts = namespace.split('.');
        createNamespace = '';
        for (i = 0, len = parts.length; i < len; i++) {
          part = parts[i];
          createNamespace += "\n" + indent + "unless " + prefix + part + "?";
          createNamespace += "\n" + indent + "   " + prefix + part + " = {}";
          prefix += part + '.';
        }
        return createNamespace;
      }

      makeStartFile() {
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
      }

      makeSubStartFile(file) {
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
      }

      flush() {
        return Promise.resolve().then(() => {
          return this.push(this.makeStartFile());
        }).then(() => {
          return this.compose();
        }).then(() => {
          var file, i, len, ref1, ref2, results, subStartFile;
          ref1 = this.processed;
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            file = ref1[i];
            if (((ref2 = file.wrapped) != null ? ref2.special : void 0) === 'start' && (subStartFile = this.makeSubStartFile(file))) {
              results.push(this.push(subStartFile));
            } else {
              results.push(void 0);
            }
          }
          return results;
        }).then(() => {
          var file, i, len, ref1, ref2, ref3, results;
          ref1 = this.processed;
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            file = ref1[i];
            if (!(((ref2 = file.wrapped) != null ? ref2.special : void 0) === 'end' || ((ref3 = file.wrapped) != null ? ref3.special : void 0) === 'start')) {
              results.push(this.push(file));
            } else {
              results.push(void 0);
            }
          }
          return results;
        });
      }

    };

    Compose.prototype.transform = Compose.prototype.collect;

    return Compose;

  }).call(this);

}).call(this);

//# sourceMappingURL=maps/Compose.js.map
