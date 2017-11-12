(function() {
  var Compose, Loader, Wrap, parse, path, vfs, wrapper;

  Wrap = require('./Wrap');

  Compose = require('./Compose');

  Loader = require('./Loader');

  parse = require('./parse');

  path = require('path');

  vfs = require('vinyl-fs');

  module.exports = wrapper = function(options) {
    return new Wrap(options);
  };

  module.exports.wrap = module.exports;

  module.exports.compose = function(options) {
    return new Compose(options);
  };

  module.exports.composeModule = function(options, src) {
    var base;
    if (typeof src === "string") {
      src = [src];
    }
    base = path.dirname(require.resolve(options.module + '/package.json'));
    src = src.map(function(src) {
      return path.join(base, src);
    });
    return vfs.src(src).pipe(wrapper.compose(options));
  };

  module.exports.loader = function(options) {
    return new Loader(options);
  };

}).call(this);
