const { check, validationResult } = require('express-validator');

const checkRegister = [
  check('email', 'Please include a valid email').isEmail(),
  check('firstName', 'First Name is required').notEmpty(),
  check('lastName', 'Last Name is required').notEmpty(),
  check(
    'password',
    'Please enter a password with 6 or more characters'
  ).isLength({ min: 6 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, return them to the client
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const checkLogin = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, return them to the client
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const checkUpdate = [
  check('email', 'Please include a valid email').isEmail(),
  check('newPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('confirmPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, return them to the client
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const checkResetPassword = [
  check('newPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('confirmPassword', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, return them to the client
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { checkRegister, checkLogin, checkUpdate, checkResetPassword };
