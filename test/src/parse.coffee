assert = require('chai').assert
parse = require('../lib/parse')

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
