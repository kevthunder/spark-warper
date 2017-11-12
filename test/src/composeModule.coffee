chai = require('chai')
chai.use(require('chai-fs'))
assert = chai.assert
wrapper = require('../lib/spark-wrapper')
clearOutput = require('./clearOutput')
gulp = require('gulp')
merge = require('merge2')
coffee = require('gulp-coffee')
concat = require('gulp-concat')

describe 'Compose with modules', ->
  beforeEach clearOutput

  it 'compose external module', (done)->
      merge([
          gulp.src(['./test/files/_remove_require.coffee'])
          wrapper.composeModule({namespace:'Spark.MyModule',module:'my-module'},'*.coffee')
          gulp.src(['./test/files/ExternalDependantClass.coffee'])
      ])
      .pipe(wrapper.compose({namespace:'Spark'}))
      .pipe(concat('spark.coffee'))
      .pipe(coffee())
      .pipe(gulp.dest('./test/output/'))
      .on 'end', ->
        assert.pathExists('./test/output/spark.js')
        Spark = require('./output/spark.js')
        assert.isDefined(Spark.MyModule)
        assert.isFunction(Spark.MyModule.CompiledClass)
        assert.isFunction(Spark.MyModule.CompiledClass.definition)
        obj = new Spark.MyModule.CompiledClass()
        assert.equal obj.hello(), 'hello', 'CompiledClass::hello'
        obj = new Spark.ExternalDependantClass()
        assert.equal obj.hello(), 'hello', 'ExternalDependantClass::hello'
        done()
        
  it 'compose external module same namespace', (done)->
      merge([
          gulp.src(['./test/files/_remove_require.coffee'])
          wrapper.composeModule({namespace:'Spark',module:'my-module'},'*.coffee')
          gulp.src(['./test/files/ExternalDependantClass.coffee'])
      ])
      .pipe(wrapper.compose({namespace:'Spark'}))
      .pipe(concat('spark.coffee'))
      .pipe(coffee())
      .pipe(gulp.dest('./test/output/'))
      .on 'end', ->
        assert.pathExists('./test/output/spark.js')
        Spark = require('./output/spark.js')
        assert.isFunction(Spark.CompiledClass)
        assert.isFunction(Spark.CompiledClass.definition)
        obj = new Spark.CompiledClass()
        assert.equal obj.hello(), 'hello', 'CompiledClass::hello'
        obj = new Spark.ExternalDependantClass()
        assert.equal obj.hello(), 'hello', 'ExternalDependantClass::hello'
        done()

  it 'compose interdependant modules', (done)->
      merge([
          gulp.src(['./test/files/_remove_require.coffee'])
          wrapper.composeModule({namespace:'Spark',module:'my-module'},'*.coffee')
            .pipe(wrapper.composeModule({namespace:'Spark',module:'my-module2'},'*.coffee'))
          gulp.src(['./test/files/ExternalDependantClass.coffee'])
      ])
      .pipe(wrapper.compose({namespace:'Spark'}))
      .pipe(concat('spark.coffee'))
      .pipe(coffee())
      .pipe(gulp.dest('./test/output/'))
      .on 'end', ->
        assert.pathExists('./test/output/spark.js')
        Spark = require('./output/spark.js')
        assert.isFunction(Spark.CompiledClass)
        assert.isFunction(Spark.CompiledClass.definition)
        obj = new Spark.CompiledClass()
        assert.equal obj.hello(), 'hello', 'CompiledClass::hello'
        obj = new Spark.ExternalDependantClass()
        assert.equal obj.hello(), 'hello', 'ExternalDependantClass::hello'
        obj = new Spark.InterDependantClass()
        assert.equal obj.hello(), 'hello', 'InterDependantClass::hello'
        done()