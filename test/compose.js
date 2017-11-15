(function() {
  var assert, chai, clearOutput, coffee, concat, gulp, merge, streamqueue, wrapper;

  chai = require('chai');

  chai.use(require('chai-fs'));

  assert = chai.assert;

  wrapper = require('../lib/spark-wrapper');

  clearOutput = require('./clearOutput');

  gulp = require('gulp');

  merge = require('merge2');

  coffee = require('gulp-coffee');

  concat = require('gulp-concat');

  streamqueue = require('streamqueue');

  describe('Compose', function() {
    beforeEach(clearOutput);
    it('compose and concat files', function(done) {
      assert.notPathExists('./test/output/spark.js');
      return gulp.src(['./test/files/_remove_require.coffee', './test/files/DependantClass.coffee', './test/files/DependantCommentClass.coffee', './test/files/CompiledClass.coffee']).pipe(wrapper.compose({
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
        assert.equal(obj.hello2(), 'hello', 'DependantClass::hello2');
        return done();
      });
    });
    it('compose with multiple call', function(done) {
      assert.notPathExists('./test/output/spark.js');
      return merge([
        gulp.src(['./test/files/_remove_require.coffee']), gulp.src(['./test/files/DependantCommentClass.coffee', './test/files/CompiledClass.coffee']).pipe(wrapper.compose({
          namespace: 'Spark'
        })), gulp.src(['./test/files/IndirectDependantClass.coffee'])
      ]).pipe(wrapper.compose({
        namespace: 'Spark'
      })).pipe(concat('spark.coffee')).pipe(coffee()).pipe(gulp.dest('./test/output/')).on('end', function() {
        var Spark, obj;
        assert.pathExists('./test/output/spark.js');
        Spark = require('./output/spark.js');
        assert.isFunction(Spark.CompiledClass);
        assert.isFunction(Spark.CompiledClass.definition);
        obj = new Spark.CompiledClass();
        assert.equal(obj.hello(), 'hello', 'CompiledClass::hello');
        obj = new Spark.IndirectDependantClass();
        assert.equal(obj.hello(), 'hello', 'IndirectDependantClass::hello');
        return done();
      });
    });
    it('compose with aliased module', function(done) {
      return gulp.src(['./test/files/_remove_require.coffee', './test/files/CompiledClass.coffee', './test/files/ExternalDependantClass.coffee']).pipe(wrapper.compose({
        namespace: 'Spark',
        aliases: {
          'my-module': 'Spark'
        }
      })).pipe(concat('spark.coffee')).pipe(coffee()).pipe(gulp.dest('./test/output/')).on('end', function() {
        var Spark, obj;
        assert.pathExists('./test/output/spark.js');
        Spark = require('./output/spark.js');
        assert.isFunction(Spark.CompiledClass);
        assert.isFunction(Spark.CompiledClass.definition);
        obj = new Spark.CompiledClass();
        assert.equal(obj.hello(), 'hello', 'CompiledClass::hello');
        assert.isFunction(Spark.ExternalDependantClass);
        assert.isFunction(Spark.ExternalDependantClass.definition);
        obj = new Spark.ExternalDependantClass();
        assert.equal(obj.hello(), 'hello', 'ExternalDependantClass::hello');
        return done();
      });
    });
    return it('can merge many composes', function(done) {
      assert.notPathExists('./test/output/spark.js');
      return streamqueue({
        objectMode: true
      }, gulp.src(['./test/files/_remove_require.coffee']).pipe(coffee({
        bare: true
      })), gulp.src(['./test/files/DependantCommentClass.coffee', './test/files/CompiledClass.coffee']).pipe(wrapper.compose({
        namespace: 'Spark'
      })).pipe(concat('spark.coffee')).pipe(coffee()), gulp.src(['./test/files/IndirectDependantClass.coffee']).pipe(wrapper.compose({
        namespace: 'Spark.Test',
        aliases: {
          'DependantCommentClass': 'Spark.DependantCommentClass'
        },
        partOf: 'Spark'
      })).pipe(concat('spark-test.coffee')).pipe(coffee())).pipe(concat('spark.js')).pipe(gulp.dest('./test/output/')).on('end', function() {
        var Spark, obj;
        assert.pathExists('./test/output/spark.js');
        Spark = require('./output/spark.js');
        assert.isFunction(Spark.CompiledClass);
        assert.isFunction(Spark.CompiledClass.definition);
        obj = new Spark.CompiledClass();
        assert.equal(obj.hello(), 'hello', 'CompiledClass::hello');
        obj = new Spark.Test.IndirectDependantClass();
        assert.equal(obj.hello(), 'hello', 'IndirectDependantClass::hello');
        return done();
      });
    });
  });

}).call(this);
