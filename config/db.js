const mongoose = require('mongoose');
// const config = require('config');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_HOST);

    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
