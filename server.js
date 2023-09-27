const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const bodyParser = require('body-parser');
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