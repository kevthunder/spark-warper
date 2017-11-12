chai = require('chai')
chai.use(require('chai-fs'))
assert = chai.assert
wrapper = require('../lib/spark-wrapper')
parse = require('../lib/parse')
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
    

describe 'wrapper', ->
  describe 'parse functions', ->
    it 'remove var def', ->
      contents = """
        var Foo, Bar;
        // comment
      """
      contents = parse.removeVarDef(contents,['Foo','Bar'],contents.length)
      assert.equal contents.trim(), '// comment'
    it 'remove some var def', ->
      contents = """
        var Foo, Baz, Bar;
        // comment
      """
      contents = parse.removeVarDef(contents,['Foo','Bar'],contents.length)
      assert.equal contents.trim(), 'var Baz;\n// comment'

    it 'remove var def with init', ->
      contents = """
        var Foo, Bar, FooBar = 'lol';
        // comment
      """
      contents = parse.removeVarDef(contents,['Foo','Bar'],contents.length)
      assert.equal contents.trim(), "var FooBar = 'lol';\n// comment"

    it 'remove some var def with init', ->
      contents = """
        var Foo, Baz, Bar, FooBar = 'lol';
        // comment
      """
      contents = parse.removeVarDef(contents,['Foo','Bar'],contents.length)
      assert.equal contents.trim(), "var Baz, FooBar = 'lol';\n// comment"

    it 'extract dependecies with comments', ()->
      contents = """
        /* dependencies */
        var Path = require('path');

        var hello = 'hello';
        /* end dependencies */

        var test = hello;
      """
      res = parse.extractDependencies(contents)
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
      res = parse.extractDependencies(contents)
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
      res = parse.extractDependencies(contents)
      assert.deepEqual res.dependencies, [
        {name:'Foo',def:"require('foo');"}
        {name:'Bar',def:"require('bar');"}
      ]
      assert.equal res.contents.trim(), 'var test = Foo(Bar);'

    it 'extract dependecies coffee', ()->
      contents = """
        Foo = require('foo')
        Bar = require('./bar')

        test = Foo(Bar)
      """
      res = parse.extractDependencies(contents)
      assert.deepEqual res.dependencies, [
        {name:'Foo',def:"require('foo')"}
        {name:'Bar',def:"require('./bar')"}
      ]
      assert.equal res.contents.trim(), 'test = Foo(Bar)'

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
        .pipe(wrapper({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          assert.pathExists('./test/output/BasicClass.js')
          BasicClass = require('./output/BasicClass.js')
          assert.isFunction(BasicClass.definition)
          done()
          
    it 'wrap no dependency file', (done)->
      assert.notPathExists('./test/output/NoDependencyClass.js')
      gulp.src('./test/files/NoDependencyClass.js')
        .pipe(wrapper({namespace:'Spark'}))
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
        .pipe(wrapper({namespace:'Spark'}))
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
      gulp.src(['./test/files/DependantClass.coffee','./test/files/DependantCommentClass.coffee','./test/files/CompiledClass.coffee'])
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
    it 'create namespace loader', (done)->
      gulp.src(['./test/files/CommentedClass.js','./test/files/BasicClass.js'])
        .pipe(wrapper({namespace:'Spark'}))
        .pipe(wrapper.loader({namespace:'Spark'}))
        .pipe(gulp.dest('./test/output/'))
        .on 'end', ->
          Spark = require('./output/Spark.js')
          assert.isFunction(Spark.CommentedClass)
          assert.isFunction(Spark.BasicClass)
          obj = new Spark.CommentedClass()
          assert.equal obj.test(), 'hello'
          done()
    it 'compose external module', (done)->
        merge([
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
