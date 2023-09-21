const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');

module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    jwt.verify(token, config.get('jwtSecret'), async (error, decoded) => {
      if (error) {
        return res.status(401).json({ msg: 'Token is not valid' });
      } else {
        const user = await User.findById(decoded.user.id);
        if (!user.isAdmin) {
          return res.status(401).json({ msg: 'Unauthorized' });
        }
        req.user = decoded.user;
        next();
      }
    });
  } catch (err) {
    console.error('something wrong with auth middleware');
    res.status(500).json({ msg: 'Server Error' });
  }
};
