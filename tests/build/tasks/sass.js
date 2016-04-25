module.exports = function() {

  return gulp.src('sass')
    .pipe(wires.plugin('sass'))
    .pipe(gulp.dest('sass'));

};