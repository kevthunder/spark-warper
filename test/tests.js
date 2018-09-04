(function() {
  describe('wrapper', function() {
    require('./parse');
    return describe('compile', function() {
      require('./wrap');
      require('./loader');
      require('./compose');
      return require('./composeModule');
    });
  });

}).call(this);

//# sourceMappingURL=maps/tests.js.map
