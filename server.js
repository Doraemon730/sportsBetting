const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
app.use(cors());

// Connect Database
connectDB();

// Init Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define Routes
const apiRoutes = require('./routes/api/betroutes');
const authRoutes = require('./routes/api/auth');
const usersRoutes = require('./routes/api/users');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
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
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));