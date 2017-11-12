(function() {
  var Compose, ComposeModule, Module, Promise, Stream, path, vfs,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Compose = require('./Compose');

  vfs = require('vinyl-fs');

  path = require('path');

  Module = require("module");

  Promise = require('bluebird');

  Stream = require('./Stream');

  module.exports = ComposeModule = (function(superClass) {
    extend(ComposeModule, superClass);

    function ComposeModule(options, src1) {
      this.src = src1;
      this.opt = Object.assign(options);
      ComposeModule.__super__.constructor.call(this);
      this.piped = false;
      this.on('pipe', (function(_this) {
        return function() {
          return _this.piped = true;
        };
      })(this));
      this.composeStream = this.streamToPromise(new Compose(this.opt), (function(_this) {
        return function(file) {
          return _this.push(file);
        };
      })(this));
      this.fileStream = this.streamToPromise(this.getFilesStream(), (function(_this) {
        return function(file) {
          return _this.composeStream.stream.write(file);
        };
      })(this));
      this.fileStream["finally"]((function(_this) {
        return function() {
          if (!_this.piped) {
            return _this.end();
          }
        };
      })(this));
    }

    ComposeModule.prototype.streamToPromise = function(stream, fn) {
      var p;
      p = new Promise((function(_this) {
        return function(resolve, reject) {
          stream.on('data', fn);
          stream.on('end', function() {
            return resolve();
          });
          stream.on('close', function() {
            return resolve();
          });
          return stream.on('error', function(err) {
            return reject(err);
          });
        };
      })(this));
      p.stream = stream;
      return p;
    };

    ComposeModule.prototype.getFilesStream = function() {
      var base, src;
      src = this.src;
      if (typeof src === "string") {
        src = [src];
      }
      base = this.getBase();
      src = src.map(function(src) {
        return path.join(base, src);
      });
      return vfs.src(src);
    };

    ComposeModule.prototype.getBase = function() {
      return path.dirname(Module._resolveFilename(this.opt.module + '/package.json', require.main, false));
    };

    ComposeModule.prototype._transform = function(file, enc, cb) {
      return this.composeStream.stream.write(file, enc, cb);
    };

    ComposeModule.prototype.flush = function() {
      this.composeStream.stream.end();
      return this.composeStream;
    };

    return ComposeModule;

  })(Stream);

}).call(this);
