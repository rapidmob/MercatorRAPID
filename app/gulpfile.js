var gulp = require('gulp');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var bowerFiles = require('main-bower-files');
var rename = require('gulp-rename');
var install = require("gulp-install");
var tsd = require('gulp-tsd');
var tslint = require('gulp-tslint');
var ngConfig = require('gulp-ng-config');
var runSequence = require('run-sequence');
var KarmaServer = require('karma').Server;

var exec = require('child_process').exec;
var del = require('del');

var path = require('path');

var srcDir = './src';
var targetDir = './www';

function srcFiles(subpath) {
  return path.join(srcDir, subpath);
}

var files = {
  www: [
    srcFiles('**/*'),
    '!' + srcFiles('**/*.ts'),
    '!' + srcFiles('**/*.scss'),
    '!' + srcFiles('typings/')
  ],
  ts: srcFiles('**/*.ts'),
  sass: srcFiles('app.scss'),
  sass_all: srcFiles('**/*.scss'),
  ts_test: './test/**/*.ts'
}

gulp.task('copy:www', function() {
  return gulp.src(files.www)
    .pipe(gulp.dest(targetDir))
});

gulp.task('ts', function() {
  var tsResult = gulp.src(files.ts)
    .pipe(sourcemaps.init())
    .pipe(ts({
      noImplicitAny: true,
      target: 'ES5'
    }));

  return tsResult.js
    .pipe(concat('app.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(targetDir));
});

gulp.task('sass', function() {
  return gulp.src(files.sass)
    .pipe(sourcemaps.init())
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(targetDir));
});


gulp.task('config', function () {
  gulp.src('configuration.json')
  .pipe(ngConfig('skychain.app.config'))
  .pipe(gulp.dest(targetDir))
});

gulp.task('copy:libs', function() {
  return gulp.src(bowerFiles(), {
      base: './bower_components'
    })
    .pipe(rename(function(p) {
      p.dirname = p.dirname.split(path.sep)[0];
    }))
    .pipe(gulp.dest(path.join(targetDir, '/lib')));
});

gulp.task('install:libs', function() {
  return gulp.src(['./bower.json'])
    .pipe(install());
});

gulp.task('clean:tsd', function(cb) {
  del('./typings', cb);
});

gulp.task('install:tsd', ['clean:tsd'], function(cb) {
  tsd({
    command: 'reinstall',
    config: './tsd.json'
  }, cb);
});

gulp.task('watch', function() {
  gulp.watch(files.www, ['copy:www']);
  gulp.watch(files.ts, ['ts+lint']);
  gulp.watch(files.sass_all, ['sass']);
});

gulp.task('clean:www', function(cb) {
  del(targetDir, cb);
});

gulp.task('api_gen', function(cb) {
  exec('node scripts/api_gen.js', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
})

gulp.task('clean:src_gen', function(cb) {
  del(srcFiles('gen'), cb)
});

gulp.task('ts:test', function() {
  var tsResult = gulp.src(files.ts_test)
  .pipe(ts({
        noImplicitAny: true,
        out: 'specs.js'
      }));

  return tsResult.js.pipe(gulp.dest('test'));
});

gulp.task('karma:start', function(cb) {
  new KarmaServer({
    configFile: path.join(__dirname, 'test/karma.conf.js')
  }, cb).start()
});

gulp.task('karma:run', function(cb) {
  new KarmaServer({
    configFile: path.join(__dirname, 'test/karma.conf.js'),
    singleRun: true
  }).start()
});

gulp.task('watch:test', function() {
  gulp.watch(['./test/**/*.ts'], ['ts:test']);
});

gulp.task('lint', function() {
  return gulp.src([files.ts, '!' + srcFiles('**/*.d.ts'), '!' + srcFiles('gen/**/*')])
        .pipe(tslint())
        .pipe(tslint.report('verbose', {
          emitError: false
        }));
});

gulp.task('ts+lint', function(cb) {
  runSequence('lint', 'ts', cb);
})

gulp.task('update', ['install:libs', 'install:tsd']);
gulp.task('clean', ['clean:www', 'clean:tsd', 'clean:src_gen']);
gulp.task('gen', ['api_gen']);
gulp.task('refresh:www', ['copy:www', 'copy:libs', 'ts+lint', 'sass', 'config']);
gulp.task('www', function(cb) {
  runSequence('clean:www', 'refresh:www', cb);
});

gulp.task('test', ['watch:test', 'karma:start']);
gulp.task('test:run', function(cb) {
  runSequence('ts:test', 'karma:run', cb)
});

gulp.task('default', function(cb) {
  runSequence('clean', 'update', 'gen', 'www', cb);
});