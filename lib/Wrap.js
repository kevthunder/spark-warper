(function() {
  var Promise, Stream, Wrap, parse, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Promise = require('bluebird');

  path = require('path');

  Stream = require('./Stream');

  parse = require('./parse');

  module.exports = Wrap = (function(superClass) {
    extend(Wrap, superClass);

    function Wrap(options) {
      if (options.namespace == null) {
        throw new Error('spark-wrapper: namespace needed');
      }
      this.opt = Object.assign({}, options);
      Wrap.__super__.constructor.call(this);
    }

    Wrap.prototype.wrap = function(options, contents) {
      var dependencies;
      dependencies = [];
      return Promise.resolve().then(function() {
        var res;
        res = parse.extractDependencies(contents);
        contents = res.contents;
        return dependencies = res.dependencies;
      }).then(function() {
        var after, before, dependency, i, len;
        before = '(function(definition){ var {{className}} = definition(typeof {{namespace}} !== "undefined"?{{namespace}}:this.{{namespace}}); {{className}}.definition = definition; if (typeof module !== "undefined" && module !== null) { module.exports = {{className}}; } else { if (typeof {{namespace}} !== "undefined" && {{namespace}} !== null) { {{namespace}}.{{className}} = {{className}}; } else{ if (this.{{namespace}} == null) { this.{{namespace}} = {}; } this.{{namespace}}.{{className}} = {{className}}; } } })(';
        before = parse.replaceOptions(options, before).replace(/(var|typeof)\s/g, '$1{_}').replace(/\s/g, '').replace(/\{_\}/g, ' ');
        if (dependencies.length) {
          before += 'function(dependencies){if(dependencies==null){dependencies={};}';
          for (i = 0, len = dependencies.length; i < len; i++) {
            dependency = dependencies[i];
            before += '\nvar {{name}} = dependencies.hasOwnProperty("{{name}}") ? dependencies.{{name}} : {{def}}'.replace(/\{\{name\}\}/g, dependency.name).replace(/\{\{def\}\}/g, dependency.def);
          }
        } else {
          before += 'function(){';
        }
        after = parse.replaceOptions(options, 'return({{className}}); });').replace(/\s/g, '');
        return before + '\n' + contents + '\n' + after;
      });
    };

    Wrap.prototype.transform = function(file) {
      return Promise.resolve().then((function(_this) {
        return function() {
          var localOpt;
          localOpt = Object.assign({}, _this.opt);
          if (localOpt.className == null) {
            localOpt.className = path.basename(file.path, path.extname(file.path));
          }
          file.wraped = localOpt;
          return _this.wrap(localOpt, String(file.contents)).then(function(contents) {
            return file.contents = new Buffer(contents);
          });
        };
      })(this)).then(function() {
        return file;
      });
    };

    return Wrap;

  })(Stream);

}).call(this);
