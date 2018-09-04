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

  describe('Compose with modules', function() {
    beforeEach(clearOutput);
    it('compose external module', function(done) {
      return merge([
        gulp.src(['./test/files/_remove_require.coffee']),
        wrapper.composeModule({
          namespace: 'Spark.MyModule',
          module: 'my-module'
        },
        '*.coffee'),
        gulp.src(['./test/files/ExternalDependantClass.coffee'])
      ]).pipe(wrapper.compose({
        namespace: 'Spark'
      })).pipe(concat('spark.coffee')).pipe(coffee()).pipe(gulp.dest('./test/output/')).on('end', function() {
        var Spark, obj;
        assert.pathExists('./test/output/spark.js');
        Spark = require('./output/spark.js');
        assert.isDefined(Spark.MyModule);
        assert.isFunction(Spark.MyModule.CompiledClass);
        assert.isFunction(Spark.MyModule.CompiledClass.definition);
        obj = new Spark.MyModule.CompiledClass();
        assert.equal(obj.hello(), 'hello', 'CompiledClass::hello');
        obj = new Spark.ExternalDependantClass();
        assert.equal(obj.hello(), 'hello', 'ExternalDependantClass::hello');
        return done();
      });
    });
    it('compose external singleton module', function(done) {
      return merge([
        gulp.src(['./test/files/_remove_require.coffee']),
        wrapper.composeModule({
          namespace: 'Spark.MyModule',
          module: 'singleton-module',
          main: 'CompiledClass'
        },
        '*.coffee'),
        gulp.src(['./test/files/SingletonDependantClass.coffee'])
      ]).pipe(wrapper.compose({
        namespace: 'Spark'
      })).pipe(concat('spark.coffee')).pipe(coffee()).pipe(gulp.dest('./test/output/')).on('end', function() {
        var Spark, obj;
        assert.pathExists('./test/output/spark.js');
        Spark = require('./output/spark.js');
        assert.isDefined(Spark.MyModule);
        assert.isFunction(Spark.MyModule.CompiledClass);
        assert.isFunction(Spark.MyModule.CompiledClass.definition);
        obj = new Spark.MyModule.CompiledClass();
        assert.equal(obj.hello(), 'hello', 'CompiledClass::hello');
        obj = new Spark.SingletonDependantClass();
        assert.equal(obj.hello(), 'hello', 'ExternalDependantClass::hello');
        return done();
      });
    });
    it('compose external module same namespace', function(done) {
      return merge([
        gulp.src(['./test/files/_remove_require.coffee']),
        wrapper.composeModule({
          namespace: 'Spark',
          module: 'my-module'
        },
        '*.coffee'),
        gulp.src(['./test/files/ExternalDependantClass.coffee'])
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
        obj = new Spark.ExternalDependantClass();
        assert.equal(obj.hello(), 'hello', 'ExternalDependantClass::hello');
        return done();
      });
    });
    return it('compose interdependant modules', function(done) {
      return merge([
        gulp.src(['./test/files/_remove_require.coffee']),
        wrapper.composeModule({
          namespace: 'Spark',
          module: 'my-module'
        },
        '*.coffee').pipe(wrapper.composeModule({
          namespace: 'Spark',
          module: 'my-module2'
        },
        '*.coffee')),
        gulp.src(['./test/files/ExternalDependantClass.coffee'])
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
        obj = new Spark.ExternalDependantClass();
        assert.equal(obj.hello(), 'hello', 'ExternalDependantClass::hello');
        obj = new Spark.InterDependantClass();
        assert.equal(obj.hello(), 'hello', 'InterDependantClass::hello');
        return done();
      });
    });
  });

}).call(this);

//# sourceMappingURL=maps/composeModule.js.map
