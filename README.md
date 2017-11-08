# SparkWraper

Wrap your class for exporting with gulp

## Installation

Install with npm
```sh
npm install kevthunder/spark-wrapper --save-dev
```

## Example

```javascript
var gulp = require('gulp');
var wrapper = require('spark-wrapper');
gulp.task('build', function () {
  gulp.src('./src/SomeClass.js')
    .pipe(wrapper({namespace:'MyLibrary'}))
    .pipe(gulp.dest('./lib/'))
});
```
