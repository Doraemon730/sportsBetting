const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const {
  WednesdayJob,
  ThursdayJob,
  EtherJob
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

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}


const PORT = process.env.PORT || 5000;
const now = new Date();
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);

  WednesdayJob.start();
  ThursdayJob.start();
  EtherJob.start();
});