DependantCommentClass = require('./DependantCommentClass')

class IndirectDependantClass
  hello: ->
    (new DependantCommentClass()).hello()