(function() {
  var assert, parse;

  assert = require('chai').assert;

  parse = require('../lib/parse');

  describe('parse functions', function() {
    it('remove var def', function() {
      var contents;
      contents = "var Foo, Bar;\n// comment";
      contents = parse.removeVarDef(contents, ['Foo', 'Bar'], contents.length);
      return assert.equal(contents.trim(), '// comment');
    });
    it('remove some var def', function() {
      var contents;
      contents = "var Foo, Baz, Bar;\n// comment";
      contents = parse.removeVarDef(contents, ['Foo', 'Bar'], contents.length);
      return assert.equal(contents.trim(), 'var Baz;\n// comment');
    });
    it('remove var def with init', function() {
      var contents;
      contents = "var Foo, Bar, FooBar = 'lol';\n// comment";
      contents = parse.removeVarDef(contents, ['Foo', 'Bar'], contents.length);
      return assert.equal(contents.trim(), "var FooBar = 'lol';\n// comment");
    });
    it('remove some var def with init', function() {
      var contents;
      contents = "var Foo, Baz, Bar, FooBar = 'lol';\n// comment";
      contents = parse.removeVarDef(contents, ['Foo', 'Bar'], contents.length);
      return assert.equal(contents.trim(), "var Baz, FooBar = 'lol';\n// comment");
    });
    it('extract dependecies with comments', function() {
      var contents, res;
      contents = "/* dependencies */\nvar Path = require('path');\n\nvar hello = 'hello';\n/* end dependencies */\n\nvar test = hello;";
      res = parse.extractDependencies(contents);
      assert.deepEqual(res.dependencies, [
        {
          name: 'Path',
          def: "require('path');"
        },
        {
          name: 'hello',
          def: "'hello';"
        }
      ]);
      return assert.equal(res.contents.trim(), 'var test = hello;');
    });
    it('extract dependecies without comments', function() {
      var contents, res;
      contents = "\nvar Foo = require('foo');\n\nvar Bar = require('bar');\n\nvar test = Foo(Bar);";
      res = parse.extractDependencies(contents);
      assert.deepEqual(res.dependencies, [
        {
          name: 'Foo',
          def: "require('foo');"
        },
        {
          name: 'Bar',
          def: "require('bar');"
        }
      ]);
      return assert.equal(res.contents.trim(), 'var test = Foo(Bar);');
    });
    it('extract dependecies with var before', function() {
      var contents, res;
      contents = "var Foo, Bar;\nFoo = require('foo');\n\nBar = require('bar');\n\nvar test = Foo(Bar);";
      res = parse.extractDependencies(contents);
      assert.deepEqual(res.dependencies, [
        {
          name: 'Foo',
          def: "require('foo');"
        },
        {
          name: 'Bar',
          def: "require('bar');"
        }
      ]);
      return assert.equal(res.contents.trim(), 'var test = Foo(Bar);');
    });
    return it('extract dependecies coffee', function() {
      var contents, res;
      contents = "Foo = require('foo')\nBar = require('./bar')\n\ntest = Foo(Bar)";
      res = parse.extractDependencies(contents);
      assert.deepEqual(res.dependencies, [
        {
          name: 'Foo',
          def: "require('foo')"
        },
        {
          name: 'Bar',
          def: "require('./bar')"
        }
      ]);
      return assert.equal(res.contents.trim(), 'test = Foo(Bar)');
    });
  });

}).call(this);

//# sourceMappingURL=maps/parse.js.map
