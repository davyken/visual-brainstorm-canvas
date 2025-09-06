import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../schemas/userSchema.js';
import authMiddleware from '../middleware/auth.js';
import { tokenBlacklist } from '../middleware/tokenBlacklist.js';

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Validation middleware for user signup
const signupValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// Validation middleware for user login
const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Reusable function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// POST /users/signup
router.post('/signup', signupValidation, handleValidationErrors, async (req, res) => {
  const { name, email, password } = req.body;
  console.log('Signup attempt for email:', email);
  console.log('Original password length:', password.length);
  
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Signup failed: User already exists for email:', email);
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // No manual hashing needed - the schema middleware will handle it
    const newUser = new User({ name, email, password });
    await newUser.save();
    console.log('User created successfully for email:', email);
    res.status(201).json({ message: 'User created successfully', userId: newUser._id });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// POST /users/login
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for email:', email);
  console.log('Login password length:', password.length);
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Login failed: No user found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    console.log('User found for email:', email);
    console.log('Stored hashed password length:', user.password.length);
    console.log('Stored hash starts with:', user.password.substring(0, 10));
    console.log('Comparing password with hash...');
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isMatch);
    
    if (!isMatch) {
      console.log('Login failed: Password mismatch for user:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    console.log('Login successful for user:', email);
    res.status(200).json({ message: 'Login successful', token, userId: user._id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// GET /users/current_user
router.get('/current_user', authMiddleware, (req, res) => {
  const user = req.user;
  res.status(200).json({
    id: user._id,
    name: user.name,
    email: user.email,
  });
});

// POST /users/logout
router.post('/logout', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({ message: 'No token provided' });
  }

  // Add token to blacklist
  tokenBlacklist.add(token);

  res.status(200).json({ message: 'Logout successful' });
});

export { router as default, tokenBlacklist };