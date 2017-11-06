var TestClass2, out;
/* dependencies */
out = 'hello';
/* end dependencies */

TestClass2 = (function() {
  function TestClass2() {}

  TestClass2.prototype.test = function() {
    return out;
  };

  return TestClass2;

})();