### dependencies ###
CompiledClass = require('./CompiledClass')
### end dependencies ###

class DependantClass
  hello: ->
    (new CompiledClass()).hello()