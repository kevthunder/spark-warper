(function() {
  var assert, chai, clearOutput, coffee, concat, gulp, merge, wrapper;

  chai = require('chai');

  chai.use(require('chai-fs'));

  assert = chai.assert;

  wrapper = require('../lib/spark-wrapper');

  clearOutput = require('./clearOutput');

  gulp = require('gulp');

  merge = require('merge2');

  coffee = require('gulp-coffee');

  concat = require('gulp-concat');

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
    return it('compose with multiple call', function(done) {
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
  });

}).call(this);
