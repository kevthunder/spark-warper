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
  unless fs.existsSync(directory)
    return cb()
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

    it 'extract dependecies with comments', ()->
      contents = """
        /* dependencies */
        var Path = require('path');

        var hello = 'hello';
        /* end dependencies */

        var test = hello;
      """
      res = wraper.fn.extractDependencies(contents)
      assert.deepEqual res.dependencies, [
        {name:'Path',def:"require('path');"}
        {name:'hello',def:"'hello';"}
      ]
      assert.equal res.contents.trim(), 'var test = hello;'

    it 'extract dependecies without comments', ()->
      contents = """

        var Foo = require('foo');
        
        var Bar = require('bar');

        var test = Foo(Bar);
      """
      res = wraper.fn.extractDependencies(contents)
      assert.deepEqual res.dependencies, [
        {name:'Foo',def:"require('foo');"}
        {name:'Bar',def:"require('bar');"}
      ]
      assert.equal res.contents.trim(), 'var test = Foo(Bar);'

    it 'extract dependecies with var before', ()->
      contents = """
        var Foo, Bar;
        Foo = require('foo');
        
        Bar = require('bar');

        var test = Foo(Bar);
      """
      res = wraper.fn.extractDependencies(contents)
      assert.deepEqual res.dependencies, [
        {name:'Foo',def:"require('foo');"}
        {name:'Bar',def:"require('bar');"}
      ]
      assert.equal res.contents.trim(), 'var test = Foo(Bar);'
  describe 'compile', ->

    beforeEach (done)->
      outputPath = path.resolve('./test/output/')
      outputCached = Object.keys(require.cache).filter (path)->
        path.includes(outputPath)
      for file in outputCached
        delete require.cache[file]

      emptyFolder './test/output/', done

    it 'wrap file', (done)->
      assert.notPathExists('./test/output/BasicClass.js')
      gulp.src('./test/files/BasicClass.js')
        .pipe(wraper({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          assert.pathExists('./test/output/BasicClass.js')
          BasicClass = require('./output/BasicClass.js')
          assert.isFunction(BasicClass.definition)
          done()

    it 'wrap no dependency file', (done)->
      assert.notPathExists('./test/output/NoDependencyClass.js')
      gulp.src('./test/files/NoDependencyClass.js')
        .pipe(wraper({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          assert.pathExists('./test/output/NoDependencyClass.js')
          NoDependencyClass = require('./output/NoDependencyClass.js')
          assert.isFunction(NoDependencyClass.definition)
          assert.equal NoDependencyClass.definition.length, 0
          obj = new NoDependencyClass()
          assert.equal obj.hello(), 'hello'
          done()

    it 'allow dependency override', (done)->
      assert.notPathExists('./test/output/CommentedClass.js')
      gulp.src('./test/files/CommentedClass.js')
        .pipe(wraper({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          assert.pathExists('./test/output/CommentedClass.js')
          CommentedClass = require('./output/CommentedClass.js')
          assert.isFunction(CommentedClass.definition)
          obj = new CommentedClass()
          assert.equal obj.test(), 'hello'
          CommentedClass = CommentedClass.definition({out:'bye'})
          obj = new CommentedClass()
          assert.equal obj.test(), 'bye'
          done()

    it 'compose and concat files', (done)->
      assert.notPathExists('./test/output/spark.js')
      merge(
         gulp.src('./test/files/_start.coffee'),
         gulp.src(['./test/files/DependantClass.coffee','./test/files/CompiledClass.coffee'])
          .pipe(wraper.compose({namespace:'Spark'})),
         gulp.src('./test/files/_end.coffee'),
      )
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
        done()

    it 'create namespace loader', (done)->
      gulp.src(['./test/files/CommentedClass.js','./test/files/BasicClass.js'])
        .pipe(wraper({namespace:'Spark'}))
        .pipe(wraper.namespaceLoader({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          done()

