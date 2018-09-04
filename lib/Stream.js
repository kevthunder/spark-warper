(function() {
  var Promise, Stream, through;

  through = require('through2');

  Promise = require('bluebird');

  module.exports = Stream = class Stream extends through.ctor() {
    constructor() {
      super({
        objectMode: true,
        highWaterMark: 16
      });
    }

    transform(file, enc) {
      return Promise.resolve(file);
    }

    collect(file, enc) {
      if (this.files == null) {
        this.files = [];
      }
      this.files.push(file);
      return null;
    }

    flush() {
      return Promise.resolve();
    }

    _transform(file, enc, cb) {
      return Promise.resolve().then(() => {
        return this.transform(file, enc);
      }).asCallback(cb);
    }

    end() {
      return Promise.resolve().then(() => {
        return this.flush();
      }).finally(() => {
        return super.end();
      });
    }

  };

}).call(this);

//# sourceMappingURL=maps/Stream.js.map
