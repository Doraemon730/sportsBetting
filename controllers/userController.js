const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const Referral = require('../models/Referral');
const Recovery = require('../models/Recovery');
const crypto = require('crypto');
const { ObjectId } = require('mongoose').Types;
const { generateReferralCode, sendEmail } = require('../utils/util');

const registerUser = async (req, res) => {
  const { email, firstName, lastName, password, birthday, referralCode } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'User already exists' }] });
    }

    const myReferralCode = generateReferralCode()
    console.log(myReferralCode)

    user = new User({
      email,
      firstName,
      lastName,
      birthday,
      referralCode: myReferralCode,
    });

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const myReferral = new Referral({
      referralcode: myReferralCode,
      userId: user.id
    });
    await myReferral.save();

    if (referralCode) {
      const referral = await Referral.findOne({ referralCode: myReferralCode });
      referral.invitesList.push(user.id);
      await referral.save();

      const referralUser = await User.findById(refferal.userId);
      referralUser.credits += 100;
      await referralUser.save();
    }

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

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'Invalid Credentials' }] });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'Invalid Credentials' }] });
    }

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

const getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
}

const getAllUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'You are not an admin!' }] });
    }
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
}

const updateUser = async (req, res) => {
  const userId = req.user.id;

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

const sendResetPasswordEmail = async (req, res) => {
  console.log(req.body);
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(400)
      .json({ errors: [{ msg: 'User not registered!' }] });
  }

  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  const subject = "Password Reset";
  const text = `Please send this link to reset your password: reset-password/${emailHash}`;
  try {
    result = await sendEmail(email, subject, text);
    const recovery = new Recovery({
      email,
      emailHash
    });
    await recovery.save();
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
}

const resetPassword = async (req, res) => {
  const { emailHash, newPassword, confirmPassword } = req.body;
  const recovery = await Recovery.findOne({ emailHash });
  if (!recovery) {
    return res
      .status(400)
      .json({ errors: [{ msg: 'Invalid Link!' }] });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ errors: [{ msg: 'Passwords do not match!' }] });
  }
  const email = recovery.email;
  const user = await User.findOne({ email });
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  const result = await User.updateOne({ _id: user._id }, { $set: user });
  await Recovery.deleteMany({ emailHash });
  res.json(result);
}

const verifyEmail = async (req, res) => {
  const { email } = req.body;

  const verificationCode = '123456'; // Generate a verification code dynamically
  const subject = "Email Verification";
  const text = `Your verification code is: ${verificationCode}`;

  try {
    result = sendEmail(email, subject, text);
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
}

const updatePromotion = async (userId, promotion) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.promotion = promotion;
      user.save();
    }
  } catch (err) {
    console.error(err.message);
  }
}

const updateAllPromotion = async (approach) => {
  try {
    const promotion = await Promotion.findOne({ approach: approach });

    const users = await User.find();
    if (users) {
      users.forEach(user => {
        user.promotion = promotion._id;
        user.save();
      });
    }
  } catch (err) {
    console.error(err.message);
  }
}
module.exports = {
  registerUser, loginUser, getUserDetail, getAllUsers, updateUser, verifyEmail,
  updatePromotion, updateAllPromotion, sendResetPasswordEmail, resetPassword
};
