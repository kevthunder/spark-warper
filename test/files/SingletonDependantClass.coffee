CompiledClass = require('singleton-module')

class SingletonDependantClass
  hello: ->
    (new CompiledClass()).hello()