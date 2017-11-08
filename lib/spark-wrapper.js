(function() {
  var Compose, Loader, Wrap, parse;

  Wrap = require('./Wrap');

  Compose = require('./Compose');

  Loader = require('./Loader');

  parse = require('./parse');

  module.exports = function(options) {
    return new Wrap(options);
  };

  module.exports.wrap = module.exports;

  module.exports.compose = function(options) {
    return new Compose(options);
  };

  module.exports.loader = function(options) {
    return new Loader(options);
  };

}).call(this);
