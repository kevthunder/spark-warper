(function() {
  var Promise, Stream, through,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  through = require('through2');

  Promise = require('bluebird');

  module.exports = Stream = (function(superClass) {
    extend(Stream, superClass);

    function Stream() {
      Stream.__super__.constructor.call(this, {
        objectMode: true,
        highWaterMark: 16
      });
    }

    Stream.prototype.transform = function(file, enc) {
      return Promise.resolve(file);
    };

    Stream.prototype.collect = function(file, enc) {
      if (this.files == null) {
        this.files = [];
      }
      this.files.push(file);
      return null;
    };

    Stream.prototype.flush = function() {
      return Promise.resolve();
    };

    Stream.prototype._transform = function(file, enc, cb) {
      return Promise.resolve().then((function(_this) {
        return function() {
          return _this.transform(file, enc);
        };
      })(this)).asCallback(cb);
    };

    Stream.prototype.end = function() {
      return Promise.resolve().then((function(_this) {
        return function() {
          return _this.flush();
        };
      })(this))["finally"]((function(_this) {
        return function() {
          return Stream.__super__.end.call(_this);
        };
      })(this));
    };

    return Stream;

  })(through.ctor());

}).call(this);
