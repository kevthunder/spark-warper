var BasicClass, path;

path = require('path');

BasicClass = (function() {
  function BasicClass() {}

  BasicClass.prototype.hello = function() {
    return 'hello';
  };

  return BasicClass;

})();

