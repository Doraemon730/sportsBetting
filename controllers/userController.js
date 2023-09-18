const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const Referral = require('../models/Referral');
const Recovery = require('../models/Recovery');

const { Web3 } = require('web3');


const crypto = require('crypto');
const { ObjectId } = require('mongoose').Types;
const { generateReferralCode, sendEmail } = require('../utils/util');
const { updateTotal } = require('../controllers/statisticsController');
const { isEmpty } = require('../utils/util');
// const WebSocketService = require('../services/webSocketService'); // Import your WebSocket service
const infuraWebSocket = process.env.ETHEREUM_NODE_URL;
const web3 = new Web3(new Web3.providers.HttpProvider(infuraWebSocket));

// const createWallet = () => {
//   const newWallet = web3.eth.accounts.create();
//   return newWallet;
// }
const registerUser = async (req, res) => {
  const { email, firstName, lastName, password, birthday, referralCode } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'User already exists' }] });
    }

    const myReferralCode = generateReferralCode();
    const infuraWebSocket = "https://sepolia.infura.io/v3/7bb47d850a2f4695834c80aeb781dd01";
    const web3 = new Web3(new Web3.providers.HttpProvider(infuraWebSocket));
    const wallet = web3.eth.accounts.create();
    const walletAddress = wallet.address;
    console.log(walletAddress);
    console.log(wallet.privateKey);
    user = new User({
      email,
      firstName,
      lastName,
      birthday,
      myReferralCode,
      referralCode,
      walletAddress,
      privateKey: wallet.privateKey
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    //WebSocketService.emit('userRegistered', { userId: user._id });
    //const balanceEventEmitter = WebSocketService.connectToEthereumNode(walletAddress);

    const myReferral = new Referral({

      referralCode: myReferralCode,
      userId: user.id
    });
    await myReferral.save();

    if (!isEmpty(referralCode)) {
      console.log(referralCode);
      const referral = await Referral.findOne({ referralCode: referralCode });
      // referral.invitesList.push(user.id);
      if (referral.invitesList == null) {
        referral.invitesList = [];
      }
      referral.invitesList.push({ invitedUserId: user.id, betAmount: 0 });
      await referral.save();


      const referralUser = await User.findById(referral.userId);
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
    const user = await User.findOne({ email });
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

    const now = new Date();
    if (user.lastlogin) {
      if (now.getDate() !== user.lastlogin.getDate())
        await updateTotal();
    } else {
      await updateTotal();
    }
    user.lastlogin = now;

    await user.save();

    user.password = undefined;
    user.isAdmin = undefined;
    //user.promotion = undefined;
    user.privateKey = undefined;

    jwt.sign(
      payload,
      config.get('jwtSecret'),
      { expiresIn: '24 hours' },
      (err, token) => {

        if (err) throw err;
        res.json({
          token: token,
          user: user
        });
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

    result.passsword = undefined;
    result.isAdmin = undefined;
    result.privateKey = undefined;
    res.json(result)

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
}

const sendResetPasswordEmail = async (req, res) => {
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
  result.passsword = undefined;
  result.isAdmin = undefined;
  result.privateKey = undefined;
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


const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;

    const count = await User.countDocuments();
    const totalPages = Math.ceil(count / limit);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    if (endIndex < count) {
      results.next = {
        page: page + 1,
        limit: limit
      };
    }

    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit
      };
    }

    results.totalPages = totalPages;
    results.results = await User.find({}, { password: 0, privateKey: 0 }).skip(startIndex).limit(limit);
    res.json(results);
  } catch (error) {
    res.status(500).json(error.message);
  }
}

const getWallentBalance = async (req, res) => {
  try {
    const id = req.user.id;
    const user = await User.findById(id);
    if (!user)
      res.status(404).json("User not found");
    const walletAddress = user.walletAddress;
    const balance = await web3.eth.getBalance(walletAddress);
    res.json({ balance: balance });
  } catch (error) {
    console.log(error.message);
  }
}





module.exports = {
  registerUser, loginUser, getUserDetail, getAllUsers, updateUser, verifyEmail,
  updatePromotion, updateAllPromotion, sendResetPasswordEmail, resetPassword,
  getUsers
};
