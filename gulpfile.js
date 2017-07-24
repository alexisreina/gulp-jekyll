const gulp = require('gulp');
const del  = require('del');
const child = require('child_process');
const gutil = require('gulp-util');
const plumber = require('gulp-plumber');
const sass = require('gulp-ruby-sass');
const imagemin = require('gulp-imagemin');
const uglify = require('gulp-uglify');
const stripDebug = require('gulp-strip-debug');
const autoprefixer = require('gulp-autoprefixer');
const csso = require('gulp-csso');
const postcss = require('gulp-postcss');
const htmlmin = require('gulp-htmlmin');
const newer = require('gulp-newer');
const size = require('gulp-size');
const sourcemaps = require('gulp-sourcemaps');

const browserSync = require('browser-sync').create();
const browserify = require('browserify');
const watchify = require('watchify');
const source = require('vinyl-source-stream');

// bundler
const bundler = browserify({
  entries: ['src/assets/scripts/main.js'],
  debug: true,
  insertGlobals: true,
  cache: {},
  packageCache: {},
  fullPaths: true
});

const rebundle = () => {
  return bundler
    .bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('dist/assets/scripts'))
    .pipe(browserSync.stream({ once: true }));
}

bundler.on('update', rebundle);
bundler.on('log', gutil.log);

// jekyll
gulp.task('jekyll', done => {
  const jekyll = child.exec('bundle exec jekyll build -s src -d .tmp --incremental', {
    shell: true
  }, (err, stdout, stderr) => {
    if (err)
      gutil.log('Jekyll: ' + err);
    if (stdout)
      gutil.log('Jekyll: ' + stdout);
    if (stderr)
      gutil.log('Jekyll: ' + stderr);
    
    done()
  });
});


// build tasks
gulp.task('build-jekyll', ['jekyll'], () => {
  return gulp.src('.tmp/**/*')
    .pipe(plumber())
    .pipe(size())
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream({ once: true }));
});

gulp.task('build-html', ['build-jekyll'], () => {
  return gulp.src('dist/**/*.html')
    .pipe(plumber())
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(size())
    .pipe(gulp.dest('dist'));
});

gulp.task('build-sass', () => {
  return sass('src/_sass/*.{sass,scss}', { sourcemap: true })
    .pipe(plumber())
    .pipe(sourcemaps.write())
    .pipe(autoprefixer('last 2 version'))
    .pipe(postcss([ require('postcss-flexbugs-fixes') ]))
    .pipe(size())
    .pipe(gulp.dest('dist/assets/styles'))
    .pipe(browserSync.stream({ once: true, match: '**/*.css' }));
});

gulp.task('build-fonts', () => {
  return gulp.src('src/assets/fonts/**/*.{ttf,eot,woff,woff2}')
    .pipe(gulp.dest('dist/assets/fonts'))
    .pipe(browserSync.stream({ once: true }));
});

gulp.task('build-images', () => {
  return gulp.src('src/assets/images/**/*.{jpg,gif,png,svg}')
    .pipe(plumber())
    .pipe(newer('dist/assets/images'))
    .pipe(imagemin())
    .pipe(gulp.dest('dist/assets/images'))
    .pipe(browserSync.stream({ once: true }));
});

gulp.task('build-css', ['build-sass'], () => {
  return gulp.src('dist/assets/styles/*.css')
    .pipe(plumber())
    .pipe(csso())
    .pipe(size())
    .pipe(gulp.dest('dist/assets/styles'));
})

gulp.task('build-scripts', rebundle);

gulp.task('watch', ['build-jekyll', 'build-sass', 'build-images', 'build-fonts', 'build-scripts'], () => {
  browserSync.init({
    notify: false,
    logPrefix: 'BS',
    server: ['dist']
  });
  
  gulp.watch('src/**/*.{md,html,xml}', ['build-jekyll']);
  
  gulp.watch('src/_sass/**/*.{sass,scss}', ['build-sass']);
  
  gulp.watch('src/assets/images/**/*.{jpg,jpeg,png,gif,svg}', ['build-images']);
  
  gulp.watch('src/assets/fonts/**/*.{eot,ttf,otf,svg,woff,woff2}', ['build-fonts']);
  
  gulp.watch('src/assets/scripts/**/*.{js,jsx}', ['build-scripts']);
});

gulp.task('build', ['build-html', 'build-css', 'build-images', 'build-fonts', 'build-scripts'], () => {
  return gulp.src('dist/assets/scripts/**/*.js')
    .pipe(plumber())
    .pipe(uglify())
    .pipe(stripDebug())
    .pipe(gulp.dest('dist/assets/scripts'));
});

gulp.task('default', ['build']);
