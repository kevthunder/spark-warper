(function() {
  var assert, chai, emptyFolder, fs, gulp, path, wraper;

  chai = require('chai');

  chai.use(require('chai-fs'));

  assert = chai.assert;

  wraper = require('../dist/spark-wraper');

  gulp = require('gulp');

  fs = require('fs');

  path = require('path');

  emptyFolder = function(directory, cb) {
    return fs.readdir(directory, function(err, files) {
      var done, file, i, len, results;
      if (err) {
        cb(err);
      }
      done = 0;
      results = [];
      for (i = 0, len = files.length; i < len; i++) {
        file = files[i];
        results.push(fs.unlink(path.join(directory, file), function(err) {
          if (err) {
            return cb(err);
          } else {
            done++;
            if (done === files.length) {
              return cb();
            }
          }
        }));
      }
      return results;
    });
  };

  describe('wraper', function() {
    describe('functions', function() {
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
        contents = "var Foo, Bar;\nFoo = require('foo');\n\nBar = require('bar');\n\nvar test = Foo(Bar);";
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
    return describe('compile', function() {
      beforeEach(function(done) {
        return emptyFolder('./test/output/', done);
      });
      it('wrap file', function(done) {
        assert.notPathExists('./test/output/TestClass.js');
        return gulp.src('./test/files/TestClass.js').pipe(wraper({
          namespace: 'Spark'
        })).pipe(gulp.dest('./test/output/')).on('end', function() {
          var TestClass;
          assert.pathExists('./test/output/TestClass.js');
          TestClass = require('./output/TestClass.js');
          assert.isFunction(TestClass.definition);
          return done();
        });
      });
      return it('allow dependency override', function(done) {
        assert.notPathExists('./test/output/TestClass2.js');
        return gulp.src('./test/files/TestClass2.js').pipe(wraper({
          namespace: 'Spark'
        })).pipe(gulp.dest('./test/output/')).on('end', function() {
          var TestClass2, obj;
          assert.pathExists('./test/output/TestClass2.js');
          TestClass2 = require('./output/TestClass2.js');
          assert.isFunction(TestClass.definition);
          obj = new TestClass2();
          assert.equal(obj.test(), 'hello');
          TestClass2 = TestClass2.definition({
            out: 'bye'
          });
          obj = new TestClass2();
          assert.equal(obj.test(), 'bye');
          return done();
        });
      });
    });
  });

}).call(this);
