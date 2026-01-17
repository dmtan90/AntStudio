import { Router } from 'express';
import { User } from '../models/User.js';
import { connectDB } from '../utils/db.js';
import { generateToken } from '../utils/jwt.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        await connectDB();

        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is disabled. Please contact support.' });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user);

        // Set cookie
        res.cookie('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            path: '/',
            sameSite: 'lax'
        });

        // Return user data (without password) and token
        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    subscription: user.subscription,
                    quota: user.quota,
                    emailVerified: user.emailVerified
                },
                token
            }
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Login failed' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        await connectDB();

        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create new user
        const user = await User.create({
            email: email.toLowerCase(),
            password,
            name,
            role: 'user',
            isActive: true
        });

        // Generate token
        const token = generateToken(user);

        // Set cookie
        res.cookie('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
            sameSite: 'lax'
        });

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    subscription: user.subscription,
                    quota: user.quota,
                    emailVerified: user.emailVerified
                },
                token
            }
        });
    } catch (error: any) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || 'Registration failed' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const user = await User.findById(req.user!.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    subscription: user.subscription,
                    quota: user.quota,
                    emailVerified: user.emailVerified,
                    language: user.language
                }
            }
        });
    } catch (error: any) {
        console.error('Get user error:', error);
        res.status(500).json({ error: error.message || 'Failed to get user' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('auth-token', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user!.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error: any) {
        console.error('Change password error:', error);
        res.status(500).json({ error: error.message || 'Failed to change password' });
    }
});

export default router;
