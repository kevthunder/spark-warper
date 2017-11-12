(function() {
  var assert, chai, clearOutput, gulp, wrapper;

  chai = require('chai');

  chai.use(require('chai-fs'));

  assert = chai.assert;

  wrapper = require('../lib/spark-wrapper');

  clearOutput = require('./clearOutput');

  gulp = require('gulp');

  describe('Loader', function() {
    beforeEach(clearOutput);
    return it('create namespace loader', function(done) {
      return gulp.src(['./test/files/CommentedClass.js', './test/files/BasicClass.js']).pipe(wrapper({
        namespace: 'Spark'
      })).pipe(wrapper.loader({
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

}).call(this);
