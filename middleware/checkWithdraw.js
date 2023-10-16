const { Mutex } = require('async-mutex');
require('../utils/log');
// A place to store mutexes for each user
const userMutexes = {};

async function checkWithdraw(req, res, next) {
  // If a mutex doesn't exist for this user yet, create one
  if (!userMutexes[req.user.id]) {
    userMutexes[req.user.id] = new Mutex();
  }

  let mutex = userMutexes[req.user.id];

  if (mutex.isLocked()) {
    console.log("Mutex on " +  req.user.id);
    res.status(429).json({ message: "Can't process multiple requests at the same time." });
    return;
  }

  const release = await mutex.acquire();
  req.release = release;

  next();
}

module.exports = checkWithdraw;