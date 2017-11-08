Promise = require('bluebird');
path = require('path');
Stream = require('./Stream');
parse = require('./parse');

module.exports = class Wrap extends Stream
  constructor: (options)->
    if !options.namespace?
      throw new Error('spark-wrapper: namespace needed')
    @opt = Object.assign({},options)
    super()

  wrap: (options, contents) ->
    dependencies = []
    Promise.resolve().then ->
      res = parse.extractDependencies(contents)
      contents = res.contents
      dependencies = res.dependencies
    .then ->
      before = '(function(definition){
          {{className}} = definition(typeof({{namespace}}) !== "undefined"?{{namespace}}:this.{{namespace}});
          {{className}}.definition = definition;
          if (typeof(module) !== "undefined" && module !== null) {
            module.exports = {{className}};
          } else {
            if (typeof({{namespace}}) !== "undefined" && {{namespace}} !== null) {
              {{namespace}}.{{className}} = {{className}};
            } else{
              if (this.{{namespace}} == null) {
                this.{{namespace}} = {};
              }
              this.{{namespace}}.{{className}} = {{className}};
            }
          }
        })(
      '
      before = parse.replaceOptions(options,before).replace(/\s/g,'')
      if dependencies.length
        before += 'function(dependencies){if(dependencies==null){dependencies={};}'
        for dependency in dependencies
          before += '\nvar {{name}} = dependencies.hasOwnProperty("{{name}}") ? dependencies.{{name}} : {{def}}'
            .replace(/\{\{name\}\}/g,dependency.name).replace(/\{\{def\}\}/g,dependency.def)
      else
        before += 'function(){'

      after = parse.replaceOptions(options,'
          return({{className}});
        });
      ').replace(/\s/g,'')
      before + '\n' + contents + '\n' + after

  transform: (file) ->
    Promise.resolve().then =>
      localOpt = Object.assign({},@opt)
      unless localOpt.className?
        localOpt.className = path.basename(file.path,path.extname(file.path))
      file.wraped = localOpt
      @wrap(localOpt, String(file.contents)).then (contents)->
        file.contents = new Buffer(contents)
    .then ->
      file