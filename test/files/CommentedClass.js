var CommentedClass, out;
/* dependencies */
out = 'hello';
/* end dependencies */

CommentedClass = (function() {
  function CommentedClass() {}

  CommentedClass.prototype.test = function() {
    return out;
  };

  return CommentedClass;

})();