### dependencies ###
CompiledClass = require('./CompiledClass')
### end dependencies ###

class DependantCommentClass
  hello: ->
    (new CompiledClass()).hello()