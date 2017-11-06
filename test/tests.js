(function() {
  var assert, wraper;

  assert = require('chai').assert;

  wraper = require('../dist/spark-warper');

  describe('warper', function() {
    it('remove var def', function() {
      var contents;
      contents = "var Foo, Bar;\n// comment";
      contents = wraper.fn.removeVarDef(contents, ['Foo', 'Bar'], contents.length);
      return assert.equal(contents.trim(), '// comment');
    });
    it('remove some var def', function() {
      var contents;
      contents = "var Foo, Baz, Bar;\n// comment";
      contents = wraper.fn.removeVarDef(contents, ['Foo', 'Bar'], contents.length);
      return assert.equal(contents.trim(), 'var Baz;\n// comment');
    });
    it('remove var def with init', function() {
      var contents;
      contents = "var Foo, Bar, FooBar = 'lol';\n// comment";
      contents = wraper.fn.removeVarDef(contents, ['Foo', 'Bar'], contents.length);
      return assert.equal(contents.trim(), "var FooBar = 'lol';\n// comment");
    });
    it('remove some var def with init', function() {
      var contents;
      contents = "var Foo, Baz, Bar, FooBar = 'lol';\n// comment";
      contents = wraper.fn.removeVarDef(contents, ['Foo', 'Bar'], contents.length);
      return assert.equal(contents.trim(), "var Baz, FooBar = 'lol';\n// comment");
    });
    it('extract dependecies with comments', function(done) {
      var contents;
      contents = "/* dependencies */\nvar Path = require('path');\n\nvar hello = 'hello';\n/* end dependencies */\n\nvar test = hello;";
      return wraper.fn.extractDependencies(contents, function(err, contents, dependencies) {
        if (err) {
          return done(err);
        }
        assert.deepEqual(dependencies, [
          {
            name: 'Path',
            def: "require('path');"
          }, {
            name: 'hello',
            def: "'hello';"
          }
        ]);
        assert.equal(contents.trim(), 'var test = hello;');
        return done();
      });
    });
    it('extract dependecies without comments', function(done) {
      var contents;
      contents = "\nvar Foo = require('foo');\n\nvar Bar = require('bar');\n\nvar test = Foo(Bar);";
      return wraper.fn.extractDependencies(contents, function(err, contents, dependencies) {
        if (err) {
          return done(err);
        }
        assert.deepEqual(dependencies, [
          {
            name: 'Foo',
            def: "require('foo');"
          }, {
            name: 'Bar',
            def: "require('bar');"
          }
        ]);
        assert.equal(contents.trim(), 'var test = Foo(Bar);');
        return done();
      });
    });
    return it('extract dependecies with var before', function(done) {
      var contents;
      contents = "var Foo, Bar\nFoo = require('foo');\n\nBar = require('bar');\n\nvar test = Foo(Bar);";
      return wraper.fn.extractDependencies(contents, function(err, contents, dependencies) {
        if (err) {
          return done(err);
        }
        assert.deepEqual(dependencies, [
          {
            name: 'Foo',
            def: "require('foo');"
          }, {
            name: 'Bar',
            def: "require('bar');"
          }
        ]);
        assert.equal(contents.trim(), 'var test = Foo(Bar);');
        return done();
      });
    });
  });

}).call(this);
