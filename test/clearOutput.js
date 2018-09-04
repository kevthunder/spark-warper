(function() {
  var emptyFolder, fs, path;

  path = require('path');

  fs = require('fs');

  emptyFolder = function(directory, cb) {
    if (!fs.existsSync(directory)) {
      return cb();
    }
    return fs.readdir(directory, function(err, files) {
      var done, file, i, len, results;
      if (err) {
        return cb(err);
      }
      if (files.length === 0) {
        return cb();
      }
      done = 0;
      results = [];
      for (i = 0, len = files.length; i < len; i++) {
        file = files[i];
        results.push(fs.unlink(path.join(directory, file), function(err) {
          if (err) {
            return cb(err);
          } else {
            done++;
            if (done === files.length) {
              return cb();
            }
          }
        }));
      }
      return results;
    });
  };

  module.exports = function(cb) {
    var file, i, len, outputCached, outputPath;
    outputPath = path.resolve('./test/output/');
    outputCached = Object.keys(require.cache).filter(function(path) {
      return path.includes(outputPath);
    });
    for (i = 0, len = outputCached.length; i < len; i++) {
      file = outputCached[i];
      delete require.cache[file];
    }
    return emptyFolder('./test/output/', cb);
  };

}).call(this);

//# sourceMappingURL=maps/clearOutput.js.map
