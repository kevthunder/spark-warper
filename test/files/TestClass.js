var TestClass, path;

path = require('path');

TestClass = (function() {
  function TestClass() {}

  TestClass.prototype.hello = function() {
    return 'hello';
  };

  return TestClass;

})();

