definition = function(dependencies) {
(function() {
  var TestClass, path;
  path = require('path');
  TestClass = (function() {
    function TestClass() {}
    TestClass.prototype.hello = function() {
      return 'hello';
    };
    return TestClass;
  })();
}).call(this);
TestClass=definition(Spark||this.Spark);TestClass.definition=definition;if(typeof(Spark)!=="undefined"&&Spark!==null){Spark.Tile.TestClass=TestClass;}if(typeof(module)!=="undefined"&&module!==null){module.exports=TestClass;}else{if(this.Spark==null){this.Spark={};}this.Spark.Tile.TestClass=TestClass;}