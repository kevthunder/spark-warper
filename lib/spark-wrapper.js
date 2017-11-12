(function() {
  var Compose, Loader, Wrap, wrapper;

  Wrap = require('./Wrap');

  Compose = require('./Compose');

  Loader = require('./Loader');

  module.exports = wrapper = function(options) {
    return new Wrap(options);
  };

  module.exports.wrap = module.exports;

  module.exports.compose = function(options) {
    return new Compose(options);
  };

  module.exports.composeModule = require('./composeModule');

  module.exports.loader = function(options) {
    return new Loader(options);
  };

}).call(this);
