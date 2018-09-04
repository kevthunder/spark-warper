(function() {
  var Compose, ComposeModule, Loader, Wrap, wrapper;

  Wrap = require('./Wrap');

  Compose = require('./Compose');

  Loader = require('./Loader');

  ComposeModule = require('./ComposeModule');

  module.exports = wrapper = function(options) {
    return new Wrap(options);
  };

  module.exports.wrap = module.exports;

  module.exports.compose = function(options) {
    return new Compose(options);
  };

  module.exports.composeModule = function(options, src) {
    return new ComposeModule(options, src);
  };

  module.exports.loader = function(options) {
    return new Loader(options);
  };

}).call(this);

//# sourceMappingURL=maps/spark-wrapper.js.map
