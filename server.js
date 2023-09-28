const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const geoip = require('geoip-lite');
// const https = require('https');
// const fs = require('fs');

const app = express();
const {
  WednesdayJob,
  ThursdayJob,
  EtherJob,
  MatchJob,
  WeeklyRewardJob,
  MonthlyRewardJob,
  WeekEventJob
} = require('./services/betService');



app.use(cors());

// Connect Database
connectDB();

// Init Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Apply rate limiting middleware
const limiter = rateLimit({
  windowMs: 1 * 1000, // 1 second
  max: 100, // Adjust the maximum number of requests per minute as per your requirements
  message: 'Too many requests, please try again later.',
  keyGenerator: (req) => {
    // Generate a unique key based on the user's IP address
    return req.ip;
  },
});
app.use(limiter);

// Middleware to check and ban specific states
app.use((req, res, next) => {
  // const ip = "98.155.38.149"
  const ip = req.ip; // Get the user's IP address

  const bannedCountries = ['AF', 'AU', 'BY', 'BE', 'CD', 'CU', 'CW', 'CZ',
    'DE', 'GR', 'IR', 'IQ', 'IT', 'CI', 'LR', 'LY', 'LT', 'NL', 'KP', 'PT',
    'RS', 'SK', 'ES', 'SD', 'SE', 'SY', 'ZW'];
  const bannedStates = ['HI', 'ID', 'MT', 'NV', 'WA'];

  // const ip = req.ip; // Get the user's IP address
  const geo = geoip.lookup(ip); // Use geoip-lite to get location information
  if (geo) {
    const country = geo.country; // Get the country from location information (may need to adjust depending on the database format)
    console.log(country);
    if (bannedCountries.includes(country)) {
      return res.status(403).json({ message: 'Access from your country is not allowed.' });
    }
    const state = geo.region; // Get the state from location information (may need to adjust depending on the database format)
    console.log(state);
    if (bannedStates.includes(state)) {
      return res.status(403).json({ message: 'Access from your state is not allowed.' });
    }
  }
  next();
});

// Define Routes
const apiRoutes = require('./routes/routes');
app.use('/api', apiRoutes);
app.get('/api/image/:imageName', (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, 'public/images', imageName);
  res.sendFile(imagePath);
});
// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// const options = {
//   key: fs.readFileSync('private.key'),
//   cert: fs.readFileSync('certificate.crt'),
//   passphrase: '!@QWAS3ed'
// }

const PORT = process.env.PORT || 5000;
const now = new Date();
// https.createServer(options, app).listen(PORT, () => {
//   console.log(`Server started on port ${PORT}`);

//   WednesdayJob.start();
//   ThursdayJob.start();
//   EtherJob.start();
// });

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);

  WednesdayJob.start();
  ThursdayJob.start();
  EtherJob.start();
  MatchJob.start();
  WeeklyRewardJob.start();
  MonthlyRewardJob.start();
  WeekEventJob.start();
  //walletMonitor.start();
});