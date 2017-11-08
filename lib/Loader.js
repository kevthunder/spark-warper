(function() {
  var Loader, Promise, Stream, gutil, parse, path, upath,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Promise = require('bluebird');

  path = require('path');

  gutil = require('gulp-util');

  upath = require('upath');

  Stream = require('./Stream');

  parse = require('./parse');

  module.exports = Loader = (function(superClass) {
    extend(Loader, superClass);

    function Loader(options) {
      if (options.namespace == null) {
        throw new Error('spark-wrapper: namespace needed');
      }
      this.opt = Object.assign({}, options);
      Loader.__super__.constructor.call(this);
    }

    Loader.prototype.transform = Loader.prototype.collect;

    Loader.prototype.getBase = function() {
      if (!this._base) {
        this._base = this.files[this.files.length - 1].base;
      }
      return this._base;
    };

    Loader.prototype.flush = function() {
      var contents, namespaceFile;
      namespaceFile = path.join(this.getBase(), this.opt.namespace + '.js');
      contents = 'if(module){\n';
      contents += '  module.exports = {\n';
      contents += this.files.filter(function(file) {
        return file.wraped;
      }).map(function(file) {
        return '    ' + file.wraped.className + ": require('./" + upath.relative(path.dirname(namespaceFile), file.path) + "')";
      }).join(",\n");
      contents += '\n  };\n}';
      this.files.forEach((function(_this) {
        return function(file) {
          return _this.push(file);
        };
      })(this));
      return this.push(new gutil.File({
        cwd: "",
        base: this.getBase(),
        path: namespaceFile,
        contents: new Buffer(contents)
      }));
    };

    return Loader;

  })(Stream);

}).call(this);
