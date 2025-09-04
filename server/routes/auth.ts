import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { storage } from '../storage';
import { loginSchema, registerSchema } from '@shared/schema';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Helper function to create JWT token
const createToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Helper function to set auth cookie
const setAuthCookie = (res: express.Response, token: string) => {
  res.cookie('auth-token', token, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, university, graduationYear } = req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Email, password, first name, and last name are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email.toLowerCase().trim());

    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await storage.createUser({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      university: university?.trim(),
      graduationYear: graduationYear,
      emailVerified: false,
    });

    // Create session token
    const token = createToken(newUser.id);

    // Set cookie
    setAuthCookie(res, token);

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'Registration successful',
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Failed to create account. Please try again.'
    });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await storage.getUserByEmail(email.toLowerCase().trim());

    if (!user || !user.password) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Create session token
    const token = createToken(user.id);

    // Set cookie
    setAuthCookie(res, token);

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Failed to login. Please try again.'
    });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth-token', { path: '/' });
  res.json({ message: 'Logout successful' });
});

// GET /api/user - Get current user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/verify-auth - Check if user is authenticated
router.get('/verify-auth', authMiddleware, (req, res) => {
  res.json({ authenticated: true, userId: (req as any).userId });
});

export default router;