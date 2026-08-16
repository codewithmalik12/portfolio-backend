import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const deleteFile = (filePath) => {
  if (filePath && filePath.startsWith('/uploads/')) {
    const relativePath = filePath.replace(/^\//, '');
    const fullPath = path.resolve(relativePath);
    fs.unlink(fullPath, (err) => {
      if (err) console.error('Failed to delete file:', err);
    });
  }
};

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d'
  });
};

// @desc    Register admin user
// @route   POST /api/auth/signup
// @access  Public (Only allows first administrator creation)
router.post('/signup', upload.single('profilePic'), async (req, res) => {
  const { username, email, password } = req.body;
  let profilePic = '';

  if (req.file) {
    profilePic = `/uploads/${req.file.filename}`;
  }

  try {
    if (!username || !email || !password) {
      if (req.file) deleteFile(profilePic);
      return res.status(400).json({ message: 'Please provide username, email and password' });
    }

    const userExists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (userExists) {
      if (req.file) deleteFile(profilePic);
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      profilePic,
      role: 'user' // Only users can sign up
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      if (req.file) deleteFile(profilePic);
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    if (req.file) deleteFile(profilePic);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Please provide email/username and password' });
    }

    const query = emailOrUsername.includes('@')
      ? { email: emailOrUsername.toLowerCase() }
      : { username: emailOrUsername };

    const user = await User.findOne(query);

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email/username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Verify current JWT token
// @route   GET /api/auth/verify
// @access  Private
router.get('/verify', protect, (req, res) => {
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    profilePic: req.user.profilePic,
    role: req.user.role
  });
});

// @desc    Update admin user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, upload.single('profilePic'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      if (req.file) deleteFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = req.body.username || user.username;
    user.email = req.body.email ? req.body.email.toLowerCase() : user.email;
    
    if (req.body.removeProfilePic === 'true' || req.body.removeProfilePic === true) {
      if (user.profilePic) {
        deleteFile(user.profilePic);
      }
      user.profilePic = '';
    } else if (req.file) {
      if (user.profilePic) {
        deleteFile(user.profilePic);
      }
      user.profilePic = `/uploads/${req.file.filename}`;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
      role: updatedUser.role
    });
  } catch (error) {
    if (req.file) deleteFile(`/uploads/${req.file.filename}`);
    res.status(500).json({ message: error.message });
  }
});

export default router;
