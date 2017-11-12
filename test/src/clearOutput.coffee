path = require('path');
fs = require('fs')

emptyFolder = (directory,cb)->
  unless fs.existsSync(directory)
    return cb()
  fs.readdir directory, (err, files) ->
    if err
      return cb(err)
    if files.length == 0
      return cb()
    done = 0
    for file in files
      fs.unlink path.join(directory, file), (err) ->
        if err
          cb(err)
        else
          done++
          if done == files.length
            cb()

module.exports = (cb)->
    outputPath = path.resolve('./test/output/')
    outputCached = Object.keys(require.cache).filter (path)->
      path.includes(outputPath)
    for file in outputCached
      delete require.cache[file]

    emptyFolder './test/output/', cb