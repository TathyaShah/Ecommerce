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
const userModel = require('./routes/users');
var app = express();

passport.use(new GoogleStrategy({
  clientID: process.env.ID,
  clientSecret: process.env.SECRET,
  // callbackURL: '/auth/google/callback',
  callbackURL: 'https://ecommerce-3fje.onrender.com/auth/google/callback',
  scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  const photo = profile.photos?.[0]?.value;

  let existingUser = await userModel.findOne({ email });

  if (existingUser) {
    existingUser.fullname = profile.displayName;
    existingUser.profile = photo || existingUser.profile || '/images/default-avatar.png';
    await existingUser.save();
    return done(null, existingUser);
  }

  // Create a new user if not found
  const newUser = new userModel({
    username: email,
    email: email,
    fullname: profile.displayName,
    profile: photo ?? '/images/default-avatar.png',
    // You can add other fields if needed
  });
  await newUser.save();
  return done(null, newUser);
}));
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

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404);
  res.render('404');
});

// Error handler for all other errors
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('404', { message: err.message || 'Something went wrong' });
});

module.exports = app;