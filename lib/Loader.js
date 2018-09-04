(function() {
  var Loader, Promise, Stream, Vinyl, parse, path, upath;

  Promise = require('bluebird');

  path = require('path');

  Vinyl = require('vinyl');

  upath = require('upath');

  Stream = require('./Stream');

  parse = require('./parse');

  module.exports = Loader = (function() {
    class Loader extends Stream {
      constructor(options) {
        super();
        if (options.namespace == null) {
          throw new Error('spark-wrapper: namespace needed');
        }
        this.opt = Object.assign({}, options);
      }

      getBase() {
        if (!this._base) {
          this._base = this.files[this.files.length - 1].base;
        }
        return this._base;
      }

      flush() {
        var contents, namespaceFile;
        namespaceFile = path.join(this.getBase(), (this.opt.filename || this.opt.namespace) + '.js');
        contents = 'if(module){\n';
        contents += '  module.exports = {\n';
        contents += this.files.filter(function(file) {
          return file.wraped;
        }).map(function(file) {
          return '    ' + file.wraped.className + ": require('./" + upath.relative(path.dirname(namespaceFile), file.path) + "')";
        }).join(",\n");
        contents += '\n  };\n}';
        this.files.forEach((file) => {
          return this.push(file);
        });
        return this.push(new Vinyl({
          cwd: "",
          base: this.getBase(),
          path: namespaceFile,
          contents: new Buffer(contents)
        }));
      }

    };

    Loader.prototype.transform = Loader.prototype.collect;

    return Loader;

  }).call(this);

}).call(this);

//# sourceMappingURL=maps/Loader.js.map
