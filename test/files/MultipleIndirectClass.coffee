IndirectDependantClass2 = require('./IndirectDependantClass2')
IndirectDependantClass = require('./IndirectDependantClass')

class MultipleIndirectClass
  hello: ->
    (new IndirectDependantClass()).hello()
  hi: ->
    (new IndirectDependantClass2()).hello()