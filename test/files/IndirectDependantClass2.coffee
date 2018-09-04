DependantCommentClass = require('./DependantCommentClass')

class IndirectDependantClass2
  hello: ->
    (new DependantCommentClass()).hello()