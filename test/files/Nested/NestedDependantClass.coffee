CompiledClass = require('../CompiledClass')

class NestedDependantClass
  hello: ->
    (new CompiledClass()).hello()