CompiledClass = require('./CompiledClass')
DependantCommentClass = require('./DependantCommentClass')

class DependantClass
  hello: ->
    (new CompiledClass()).hello()
  hello2: ->
    (new DependantCommentClass()).hello()