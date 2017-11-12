chai = require('chai')
chai.use(require('chai-fs'))
assert = chai.assert
wrapper = require('../lib/spark-wrapper')
clearOutput = require('./clearOutput')
gulp = require('gulp')
merge = require('merge2')
coffee = require('gulp-coffee')
concat = require('gulp-concat')

describe 'Compose', ->
  beforeEach clearOutput

  it 'compose and concat files', (done)->
    assert.notPathExists('./test/output/spark.js')
    gulp.src([
      './test/files/_remove_require.coffee'
      './test/files/DependantClass.coffee'
      './test/files/DependantCommentClass.coffee'
      './test/files/CompiledClass.coffee'
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
        obj = new Spark.DependantClass()
        assert.equal obj.hello(), 'hello', 'DependantClass::hello'
        assert.equal obj.hello2(), 'hello', 'DependantClass::hello2'
        done()

  it 'compose with multiple call', (done)->
    assert.notPathExists('./test/output/spark.js')
    merge([
      gulp.src(['./test/files/_remove_require.coffee'])
      gulp.src(['./test/files/DependantCommentClass.coffee','./test/files/CompiledClass.coffee'])
        .pipe(wrapper.compose({namespace:'Spark'}))
      gulp.src(['./test/files/IndirectDependantClass.coffee'])
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
      obj = new Spark.IndirectDependantClass()
      assert.equal obj.hello(), 'hello', 'IndirectDependantClass::hello'
      done()