chai = require('chai')
chai.use(require('chai-fs'))
assert = chai.assert
wraper = require('../dist/spark-wraper')
gulp = require('gulp')
fs = require('fs')
path = require('path')
merge = require('merge2')
coffee = require('gulp-coffee')
concat = require('gulp-concat')

emptyFolder = (directory,cb)->
  fs.readdir directory, (err, files) ->
    if err
      return cb(err)
    if files.length == 0
      return cb()
    done = 0
    for file in files
      fs.unlink path.join(directory, file), (err) ->
        if err
          cb(err)
        else
          done++
          if done == files.length
            cb()
    

describe 'wraper', ->
  describe 'functions', ->
    it 'remove var def', ->
      contents = """
        var Foo, Bar;
        // comment
      """
      contents = wraper.fn.removeVarDef(contents,['Foo','Bar'],contents.length)
      assert.equal contents.trim(), '// comment'
    it 'remove some var def', ->
      contents = """
        var Foo, Baz, Bar;
        // comment
      """
      contents = wraper.fn.removeVarDef(contents,['Foo','Bar'],contents.length)
      assert.equal contents.trim(), 'var Baz;\n// comment'

    it 'remove var def with init', ->
      contents = """
        var Foo, Bar, FooBar = 'lol';
        // comment
      """
      contents = wraper.fn.removeVarDef(contents,['Foo','Bar'],contents.length)
      assert.equal contents.trim(), "var FooBar = 'lol';\n// comment"

    it 'remove some var def with init', ->
      contents = """
        var Foo, Baz, Bar, FooBar = 'lol';
        // comment
      """
      contents = wraper.fn.removeVarDef(contents,['Foo','Bar'],contents.length)
      assert.equal contents.trim(), "var Baz, FooBar = 'lol';\n// comment"

    it 'extract dependecies with comments', (done)->
      contents = """
        /* dependencies */
        var Path = require('path');

        var hello = 'hello';
        /* end dependencies */

        var test = hello;
      """
      wraper.fn.extractDependencies contents, (err, contents, dependencies)->
        if err
          return done(err)
        assert.deepEqual dependencies, [
          {name:'Path',def:"require('path');"}
          {name:'hello',def:"'hello';"}
        ]
        assert.equal contents.trim(), 'var test = hello;'
        done()

    it 'extract dependecies without comments', (done)->
      contents = """

        var Foo = require('foo');
        
        var Bar = require('bar');

        var test = Foo(Bar);
      """
      wraper.fn.extractDependencies contents, (err, contents, dependencies)->
        if err
          return done(err)
        assert.deepEqual dependencies, [
          {name:'Foo',def:"require('foo');"}
          {name:'Bar',def:"require('bar');"}
        ]
        assert.equal contents.trim(), 'var test = Foo(Bar);'
        done()

    it 'extract dependecies with var before', (done)->
      contents = """
        var Foo, Bar;
        Foo = require('foo');
        
        Bar = require('bar');

        var test = Foo(Bar);
      """
      wraper.fn.extractDependencies contents, (err, contents, dependencies)->
        if err
          return done(err)
        assert.deepEqual dependencies, [
          {name:'Foo',def:"require('foo');"}
          {name:'Bar',def:"require('bar');"}
        ]
        assert.equal contents.trim(), 'var test = Foo(Bar);'
        done()
  describe 'compile', ->

    beforeEach (done)->
      emptyFolder './test/output/', done

    it 'wrap file', (done)->
      assert.notPathExists('./test/output/TestClass.js')
      gulp.src('./test/files/TestClass.js')
        .pipe(wraper({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          assert.pathExists('./test/output/TestClass.js')
          TestClass = require('./output/TestClass.js')
          assert.isFunction(TestClass.definition)
          done()

    it 'allow dependency override', (done)->
      assert.notPathExists('./test/output/TestClass2.js')
      gulp.src('./test/files/TestClass2.js')
        .pipe(wraper({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          assert.pathExists('./test/output/TestClass2.js')
          TestClass2 = require('./output/TestClass2.js')
          assert.isFunction(TestClass.definition)
          obj = new TestClass2()
          assert.equal obj.test(), 'hello'
          TestClass2 = TestClass2.definition({out:'bye'})
          obj = new TestClass2()
          assert.equal obj.test(), 'bye'
          done()

    it 'wrap file part', (done)->
      assert.notPathExists('./test/output/TestClass3.coffee')
      gulp.src('./test/files/TestClass3.coffee')
        .pipe(wraper.wrapPart({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          assert.pathExists('./test/output/TestClass3.coffee')
          done()

    it 'wrap file in parts', (done)->
      assert.notPathExists('./test/output/spark.js')
      merge(
         gulp.src('./test/files/_start.coffee'),
         gulp.src(['./test/files/TestClass3.coffee','./test/files/TestClass4.coffee'])
          .pipe(wraper.wrapPart({namespace:'Spark'})),
         gulp.src('./test/files/_end.coffee'),
      )
      .pipe(concat('spark.coffee'))
      .pipe(coffee())
      .pipe(gulp.dest('./test/output/'))
      .on 'end', ->
        assert.pathExists('./test/output/spark.js')
        Spark = require('./output/spark.js')
        assert.isFunction(Spark.TestClass3)
        assert.isFunction(Spark.TestClass3.definition)
        done()