require('source-map-support').install();

var gulp = require('gulp');
var rename = require("gulp-rename");
var coffee = require('gulp-coffee');
var uglify = require('gulp-uglify-es').default;
var mocha = require('gulp-mocha');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('coffee', function() {
  return gulp.src(['./src/*.coffee'])
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('./lib/'));
});

gulp.task('compress', ['coffee'], function () {
  return gulp.src('./dist/spark-wrapper.js')
    .pipe(uglify())
    .pipe(rename('spark-wrapper.min.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('coffeeTest', function() {
  return gulp.src('./test/src/*.coffee')
    .pipe(sourcemaps.init())
    .pipe(coffee())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('./test/'));
});

gulp.task('build', ['coffee', 'compress'], function () {
    console.log('Build Complete');
});

gulp.task('test', ['coffee','coffeeTest'], function() {
  return gulp.src('./test/tests.js')
    .pipe(mocha({require:['source-map-support/register']}));
});

gulp.task('test-debug', ['coffee','coffeeTest'], function() {
  return gulp.src('./test/tests.js')
    .pipe(mocha({"inspect-brk":true, require:['source-map-support/register']}));
});

gulp.task('default', ['build']);