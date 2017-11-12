CompiledClass = require('my-module').CompiledClass

class ExternalDependantClass
  hello: ->
    (new CompiledClass()).hello()