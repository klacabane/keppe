var gulp = require('gulp');
var babel = require('gulp-babel');
var concat = require('gulp-concat');

gulp.task('watch', () => {
  gulp.watch(['public/src/**/*.js'], ['6to5']);
});

gulp.task('6to5', () => {
  return gulp.src(['public/src/components/*.js', 'public/src/app.js'])
    .pipe(babel())
    .pipe(concat('app.js'))
    .pipe(gulp.dest('public/dist/'));
});

gulp.task('default', ['watch']);
