(function() {
  var Compose, Module, path, resolve, vfs;

  Compose = require('./Compose');

  vfs = require('vinyl-fs');

  path = require('path');

  Module = require("module");

  resolve = function(request) {
    return Module._resolveFilename(request, require.main, false);
  };

  module.exports = function(options, src) {
    var base;
    if (typeof src === "string") {
      src = [src];
    }
    base = path.dirname(resolve(options.module + '/package.json'));
    src = src.map(function(src) {
      return path.join(base, src);
    });
    return vfs.src(src).pipe(new Compose(options));
  };

}).call(this);
