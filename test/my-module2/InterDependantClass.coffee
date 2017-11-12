CompiledClass = require('my-module').CompiledClass

class InterDependantClass
  hello: ->
    (new CompiledClass()).hello()