# SparkWraper

Wrap your class for exporting with gulp

## Installation

Install with npm
```sh
npm install kevthunder/spark-wraper --save-dev
```

## Example

```javascript
var gulp = require('gulp');
var wraper = require('spark-wraper');
gulp.task('build', function () {
  gulp.src('./src/SomeClass.js')
    .pipe(wraper({namespace:'MyLibrary'}))
    .pipe(gulp.dest('./lib/'))
});
```
