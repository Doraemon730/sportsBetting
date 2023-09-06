const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const { ObjectId } = require('mongoose').Types;

// @route    POST api/users
// @desc     Register user
// @access   Public
router.post(
  '/register',
  check('email', 'Please include a valid email').isEmail(),
  check('firstName', 'First Name is required').notEmpty(),
  check('lastName', 'Last Name is required').notEmpty(),
  check(
    'password',
    'Please enter a password with 6 or more characters'
  ).isLength({ min: 6 }),
  //check('birthday', 'Date of Birth is required').isDate(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, firstName, lastName, password, birthday, referralCode } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      user = new User({
        email,
        firstName,
        lastName,
        birthday,
        referralCode
      });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: '24 hours' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    POST api/users
// @desc     Update user
// @access   Public
router.post(
  '/update', auth,
  check('email', 'Please include a valid email').isEmail(),
  check(
    'newPassword',
    'Please enter a password with 6 or more characters'
  ).isLength({ min: 6 }),
  check(
    'confirmPassword',
    'Please enter a password with 6 or more characters'
  ).isLength({ min: 6 }),
  async (req, res) => {

    userId = req.user.id;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, oldPassword, newPassword, confirmPassword } = req.body;

    try {
      let user = await User.findOne({ _id: new ObjectId(userId) });

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid User!' }] });
      }

      if (email !== user.email) {
        return res.status(400).json({ errors: [{ msg: 'Invalid Email!' }] });
      }


      if (oldPassword == newPassword) {
        return res.status(400).json({ errors: [{ msg: 'New password is the same as old password!' }] });
      }

      const salt = await bcrypt.genSalt(10);
      if (!bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(400).json({ errors: [{ msg: 'Invalid Password!' }] });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ errors: [{ msg: 'Passwords do not match!' }] });
      }

      user.password = await bcrypt.hash(newPassword, salt);
      const result = await User.updateOne({ _id: new ObjectId(userId) }, { $set: user });

      res.json(result)

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
