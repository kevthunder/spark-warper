(function() {
  var Compose, ComposeModule, Module, Promise, Stream, path, vfs;

  Compose = require('./Compose');

  vfs = require('vinyl-fs');

  path = require('path');

  Module = require("module");

  Promise = require('bluebird');

  Stream = require('./Stream');

  module.exports = ComposeModule = class ComposeModule extends Stream {
    constructor(options, src1) {
      super();
      this.src = src1;
      this.opt = Object.assign(options);
      this.piped = false;
      this.on('pipe', () => {
        return this.piped = true;
      });
      this.composeStream = this.streamToPromise(new Compose(this.opt), (file) => {
        return this.push(file);
      });
      this.fileStream = this.streamToPromise(this.getFilesStream(), (file) => {
        return this.composeStream.stream.write(file);
      });
      this.fileStream.finally(() => {
        if (!this.piped) {
          return this.end();
        }
      });
    }

    streamToPromise(stream, fn) {
      var p;
      p = new Promise((resolve, reject) => {
        stream.on('data', fn);
        stream.on('end', () => {
          return resolve();
        });
        stream.on('close', () => {
          return resolve();
        });
        return stream.on('error', (err) => {
          return reject(err);
        });
      });
      p.stream = stream;
      return p;
    }

    getFilesStream() {
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
    }

    getBase() {
      return path.dirname(Module._resolveFilename(this.opt.module + '/package.json', require.main, false));
    }

    _transform(file, enc, cb) {
      return this.composeStream.stream.write(file, enc, cb);
    }

    flush() {
      this.composeStream.stream.end();
      return this.composeStream;
    }

  };

}).call(this);

//# sourceMappingURL=maps/ComposeModule.js.map
