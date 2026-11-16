const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load settings from config/.env (create it from config/.env.example as needed).
dotenv.config({ path: path.join(__dirname, 'config', '.env') });

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON request bodies so routes can read req.body.
app.use(express.json());

// Return a simple response to confirm the API is running.
app.get('/', (req, res) => {
  res.json({ message: 'Users API is running', endpoint: '/api/users' });
});

// Return every user stored in MongoDB.
app.get('/api/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

// Validate and save a new user from the JSON request body.
app.post('/api/users', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Update the user identified by the route's MongoDB ID.
app.put('/api/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

// Delete the user identified by the route's MongoDB ID.
app.delete('/api/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted', user });
  } catch (error) {
    next(error);
  }
});

// Send consistent client errors for invalid IDs, invalid fields, and duplicates.
app.use((error, req, res, next) => {
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'A user with that email already exists' });
  }

  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

// Start accepting requests only after the MongoDB connection succeeds.
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => console.log(`Server listening on port ${port}`));
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });
