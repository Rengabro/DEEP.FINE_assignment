let createError = require('http-errors');
let express = require('express');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
require('dotenv').config();
const { createErrorResponse } = require('./app/utils/apiResponse');

let indexRouter = require('./app/routes/index');
const http = require("http");

let app = express();

global.CONFIG = require('./config.json');
global.path = require('path');
global.ROOT = __dirname;
global.psql = require('./app/modules/db.psql');
global.funcCmmn = require('./app/modules/func-common');

// view engine setup
app.set('views', path.join(__dirname, 'app', 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  if (req.path.startsWith('/api/')) {
    const databaseUnavailable = err.code === 'ECONNREFUSED';
    return res.status(err.status || 500).json(createErrorResponse({
      message: databaseUnavailable
        ? 'PostgreSQL에 연결할 수 없습니다. config.json의 DB를 실행한 뒤 다시 시도해 주세요.'
        : (err.message || '서버 요청을 처리하지 못했습니다.'),
      invalidRows: err.invalidRows
    }));
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const port = process.env.PORT || 3535;
http.createServer(app).listen(port, () => {
  console.log(`✅  Server is running at port 3535.`);
});

module.exports = app;
