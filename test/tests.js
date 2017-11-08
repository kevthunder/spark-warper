(function() {
  var assert, chai, coffee, concat, emptyFolder, fs, gulp, merge, parse, path, wraper;

  chai = require('chai');

  chai.use(require('chai-fs'));

  assert = chai.assert;

  wraper = require('../lib/spark-wraper');

  parse = require('../lib/parse');

  gulp = require('gulp');

  fs = require('fs');

  path = require('path');

  merge = require('merge2');

  coffee = require('gulp-coffee');

  concat = require('gulp-concat');

  emptyFolder = function(directory, cb) {
    if (!fs.existsSync(directory)) {
      return cb();
    }
    return fs.readdir(directory, function(err, files) {
      var done, file, i, len, results;
      if (err) {
        return cb(err);
      }
      if (files.length === 0) {
        return cb();
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
          }, {
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
          }, {
            name: 'Bar',
            def: "require('bar');"
          }
        ]);
        return assert.equal(res.contents.trim(), 'var test = Foo(Bar);');
      });
      return it('extract dependecies with var before', function() {
        var contents, res;
        contents = "var Foo, Bar;\nFoo = require('foo');\n\nBar = require('bar');\n\nvar test = Foo(Bar);";
        res = parse.extractDependencies(contents);
        assert.deepEqual(res.dependencies, [
          {
            name: 'Foo',
            def: "require('foo');"
          }, {
            name: 'Bar',
            def: "require('bar');"
          }
        ]);
        return assert.equal(res.contents.trim(), 'var test = Foo(Bar);');
      });
    });
    return describe('compile', function() {
      beforeEach(function(done) {
        var file, i, len, outputCached, outputPath;
        outputPath = path.resolve('./test/output/');
        outputCached = Object.keys(require.cache).filter(function(path) {
          return path.includes(outputPath);
        });
        for (i = 0, len = outputCached.length; i < len; i++) {
          file = outputCached[i];
          delete require.cache[file];
        }
        return emptyFolder('./test/output/', done);
      });
      it('wrap file', function(done) {
        assert.notPathExists('./test/output/BasicClass.js');
        return gulp.src('./test/files/BasicClass.js').pipe(wraper({
          namespace: 'Spark'
        })).pipe(gulp.dest('./test/output/')).on('end', function() {
          var BasicClass;
          assert.pathExists('./test/output/BasicClass.js');
          BasicClass = require('./output/BasicClass.js');
          assert.isFunction(BasicClass.definition);
          return done();
        });
      });
      it('wrap no dependency file', function(done) {
        assert.notPathExists('./test/output/NoDependencyClass.js');
        return gulp.src('./test/files/NoDependencyClass.js').pipe(wraper({
          namespace: 'Spark'
        })).pipe(gulp.dest('./test/output/')).on('end', function() {
          var NoDependencyClass, obj;
          assert.pathExists('./test/output/NoDependencyClass.js');
          NoDependencyClass = require('./output/NoDependencyClass.js');
          assert.isFunction(NoDependencyClass.definition);
          assert.equal(NoDependencyClass.definition.length, 0);
          obj = new NoDependencyClass();
          assert.equal(obj.hello(), 'hello');
          return done();
        });
      });
      it('allow dependency override', function(done) {
        assert.notPathExists('./test/output/CommentedClass.js');
        return gulp.src('./test/files/CommentedClass.js').pipe(wraper({
          namespace: 'Spark'
        })).pipe(gulp.dest('./test/output/')).on('end', function() {
          var CommentedClass, obj;
          assert.pathExists('./test/output/CommentedClass.js');
          CommentedClass = require('./output/CommentedClass.js');
          assert.isFunction(CommentedClass.definition);
          obj = new CommentedClass();
          assert.equal(obj.test(), 'hello');
          CommentedClass = CommentedClass.definition({
            out: 'bye'
          });
          obj = new CommentedClass();
          assert.equal(obj.test(), 'bye');
          return done();
        });
      });
      it('compose and concat files', function(done) {
        assert.notPathExists('./test/output/spark.js');
        return gulp.src(['./test/files/DependantClass.coffee', './test/files/CompiledClass.coffee']).pipe(wraper.compose({
          namespace: 'Spark'
        })).pipe(concat('spark.coffee')).pipe(coffee()).pipe(gulp.dest('./test/output/')).on('end', function() {
          var Spark, obj;
          assert.pathExists('./test/output/spark.js');
          Spark = require('./output/spark.js');
          assert.isFunction(Spark.CompiledClass);
          assert.isFunction(Spark.CompiledClass.definition);
          obj = new Spark.CompiledClass();
          assert.equal(obj.hello(), 'hello', 'CompiledClass::hello');
          obj = new Spark.DependantClass();
          assert.equal(obj.hello(), 'hello', 'DependantClass::hello');
          return done();
        });
      });
      return it('create namespace loader', function(done) {
        return gulp.src(['./test/files/CommentedClass.js', './test/files/BasicClass.js']).pipe(wraper({
          namespace: 'Spark'
        })).pipe(wraper.loader({
          namespace: 'Spark'
        })).pipe(gulp.dest('./test/output/')).on('end', function() {
          var Spark, obj;
          Spark = require('./output/Spark.js');
          assert.isFunction(Spark.CommentedClass);
          assert.isFunction(Spark.BasicClass);
          obj = new Spark.CommentedClass();
          assert.equal(obj.test(), 'hello');
          return done();
        });
      });
    });
  });

}).call(this);
