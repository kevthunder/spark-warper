(function() {
  describe('wrapper', function() {
    require('./parse');
    return describe('compile', function() {
      require('./wrap');
      require('./loader');
      return require('./compose');
    });
  });

}).call(this);
