(function() {
  var assert, chai, clearOutput, gulp, wrapper;

  chai = require('chai');

  chai.use(require('chai-fs'));

  assert = chai.assert;

  wrapper = require('../lib/spark-wrapper');

  clearOutput = require('./clearOutput');

  gulp = require('gulp');

  describe('Wrap', function() {
    beforeEach(clearOutput);
    it('wrap file', function(done) {
      assert.notPathExists('./test/output/BasicClass.js');
      return gulp.src('./test/files/BasicClass.js').pipe(wrapper({
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
      return gulp.src('./test/files/NoDependencyClass.js').pipe(wrapper({
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
    return it('allow dependency override', function(done) {
      assert.notPathExists('./test/output/CommentedClass.js');
      return gulp.src('./test/files/CommentedClass.js').pipe(wrapper({
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
  });

}).call(this);
