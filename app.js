require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
var logger = require('morgan');
const cors = require('cors')
const expressSession = require('express-session')
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const passport = require('passport');
const flash = require('connect-flash');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const localStrategy = require('passport-local').Strategy;
var app = express();

passport.use(new GoogleStrategy({
  clientID: process.env.ID,
  clientSecret: process.env.SECRET,
  callbackURL: '/auth/google/callback',
  // callbackURL: 'https://ecommerce-ug71.onrender.com/auth/google/callback',
  scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  const existingUser = await usersRouter.findOne({ email });

  if (existingUser) {
    existingUser.fullname = profile.displayName;
    await existingUser.save();
    return done(null, existingUser);
  }

  const newUser = new usersRouter({
    email,
    fullname: profile.displayName,
  });

  await newUser.save();
  done(null, newUser);
})
);
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  usersRouter.findById(id)
    .then(user => done(null, user))
    .catch(error => done(error));
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressSession({
  saveUninitialized: false,
  resave: false,
  secret: '12345789'
}))

app.use(cors())
app.use(flash());
app.use(passport.initialize())
app.use(passport.session())
passport.use(usersRouter.createStrategy());
passport.serializeUser(usersRouter.serializeUser())
passport.deserializeUser(usersRouter.deserializeUser())

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// error handler
app.use(function (err, req, res, next) {
  // Set default error status if not provided
  const status = err.status || 500;

  // Set locals for message and error; only include stack trace in development mode
  res.locals.message = err.message || 'Something went wrong';
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page with error details
  res.status(status);
});

module.exports = app;