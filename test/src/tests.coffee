assert = require('chai').assert
wraper = require('../dist/spark-wraper')

describe 'wraper', ->
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
      var Foo, Bar
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