import { Router } from 'express';
import { User } from '../models/User.js';
import { connectDB } from '../utils/db.js';
import config from '../utils/config.js';
import { generateToken } from '../utils/jwt.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { checkUserLimit } from '../middleware/licenseGating.js';
import { emailService } from '../services/email.js';
import { redisService } from '../services/RedisService.js';
import crypto from 'crypto';
import { AdminSettings } from '../models/AdminSettings.js';

import { Logger } from '../utils/Logger.js';

const router = Router();

const getDomain = async () => {
    await connectDB();
    const adminSettings = await AdminSettings.findOne();
    const settings = adminSettings?.whitelabel;
    const domain = adminSettings?.apiConfigs?.publicDomain;
    return domain || process.env.PUBLIC_BASE_URL || 'https://localhost:3000';
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        await connectDB();

        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ success: false, data: null, error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, data: null, error: 'Invalid email or password' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ success: false, data: null, error: 'Account is disabled. Please contact support.' });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, data: null, error: 'Invalid email or password' });
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
                    credits: user.credits,
                    emailVerified: user.emailVerified
                },
                token
            }
        });
    } catch (error: any) {
        Logger.error('Login error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Login failed' });
    }
});

// POST /api/auth/register
router.post('/register', checkUserLimit, async (req, res) => {
    try {
        await connectDB();

        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ success: false, data: null, error: 'Email, password, and name are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, data: null, error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, data: null, error: 'Email already registered' });
        }

        // Create new user
        const user = await User.create({
            email: email.toLowerCase(),
            passwordHash: password,
            name,
            role: 'user',
            isActive: true
        });

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail({ email: user.email, name: user.name });
        } catch (emailError) {
            Logger.error('Failed to send welcome email:', 'Auth', emailError);
            // Don't fail registration if email fails
        }

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
                    credits: user.credits,
                    emailVerified: user.emailVerified
                },
                token
            }
        });
    } catch (error: any) {
        Logger.error('Registration error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Registration failed' });
    }
});

// POST /api/auth/register-owner - Tactical initialization for first specialist
router.post('/register-owner', async (req, res) => {
    try {
        await connectDB();
        const count = await User.countDocuments();
        if (count > 0) return res.status(403).json({ success: false, error: 'Supreme Command already established.' });

        const { email, password, name } = req.body;
        const user = await User.create({
            email: email.toLowerCase(),
            passwordHash: password,
            name,
            role: 'sys-admin',
            isActive: true,
            emailVerified: true
        });

        const token = generateToken(user);
        res.status(201).json({ success: true, data: { user, token } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        await connectDB()
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ success: false, data: null, error: 'Email is required' })
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Check security best practices: maybe don't reveal user doesn't exist? 
            // For now, let's keep it simple or vague.
            return res.status(404).json({ success: false, data: null, error: 'User not found' });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex')
        user.resetPasswordToken = token
        user.resetPasswordExpires = new Date(Date.now() + 3600000) // 1 hour
        await user.save()

        // Send email
        await emailService.sendPasswordResetEmail({ email: user.email, name: user.name }, token)

        res.json({ success: true, data: { message: 'Password reset email sent' } })
    } catch (error: any) {
        Logger.error('Forgot password error:', error)
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to process request' })
    }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        await connectDB()
        const { token, newPassword } = req.body

        Logger.info('Reset password request:', 'Auth', { token, hasPassword: !!newPassword });

        if (!token || !newPassword) {
            Logger.info('Missing token or password', 'Auth', {});
            return res.status(400).json({ success: false, data: null, error: 'Token and new password are required' })
        }

        if (newPassword.length < 6) {
            Logger.info('Password too short');
            return res.status(400).json({ success: false, data: null, error: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        })

        if (!user) {
            Logger.info('User not found or token expired for token:', 'Auth', { token });
            // Let's debug why: check if token exists but expired
            const debugUser = await User.findOne({ resetPasswordToken: token });
            if (debugUser) {
                Logger.info('Token exists but expired. Expires:', 'Auth', { expires: debugUser.resetPasswordExpires, now: new Date() });
            } else {
                Logger.info('Token does not exist in DB', 'Auth', {});
            }
            return res.status(400).json({ success: false, data: null, error: 'Invalid or expired token' })
        }

        // Set new password
        user.passwordHash = newPassword // Mongoose pre-save will hash it
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined
        await user.save()

        res.json({ success: true, data: { message: 'Password reset successfully' } })

    } catch (error: any) {
        Logger.error('Reset password error:', error)
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to reset password' })
    }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const cacheKey = `user:profile:${req.user!.userId}`;

        const user = await redisService.getOrSet(cacheKey, async () => {
            return await User.findById(req.user!.userId).select('-password');
        }, 3600);

        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found' });
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
                    credits: user.credits,
                    emailVerified: user.emailVerified,
                    language: user.language,
                    socialAccounts: {
                        youtube: !!user.socialAccounts?.youtube,
                        facebook: !!user.socialAccounts?.facebook
                    },
                    systemMode: config.systemMode
                }
            }
        });
    } catch (error: any) {
        Logger.error('Get user error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to get user' });
    }
});

// GET /api/auth/credits/history
router.get('/credits/history', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.user!.userId).select('creditLogs');
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found' });
        }

        // Return logs sorted by timestamp (newest first)
        const logs = (user.creditLogs || []).sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        res.json({
            success: true,
            data: logs
        });
    } catch (error: any) {
        Logger.error('Fetch credit history error:', error);
        res.status(500).json({ success: false, data: null, error: 'Failed to fetch credit history' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('auth-token', { path: '/' });
    res.json({ success: true, data: { message: 'Logged out successfully' } });
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, data: null, error: 'Current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, data: null, error: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user!.userId);
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, data: null, error: 'Current password is incorrect' });
        }

        // Update password
        user.passwordHash = newPassword;
        await user.save();

        res.json({ success: true, data: { message: 'Password changed successfully' } });
    } catch (error: any) {
        Logger.error('Change password error:', error);
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to change password' });
    }
});

// GET /api/auth/google - Initiate Google OAuth login
router.get('/google', async (req, res) => {
    const domain = await getDomain();
    try {
        const { getGoogleLoginUrl } = await import('../utils/googleAuth.js');
        const url = await getGoogleLoginUrl();
        res.redirect(url);
    } catch (error: any) {
        Logger.error('Google OAuth initiation error:', error);
        res.redirect(`${domain}/login?error=oauth_failed`);
    }
});

// GET /api/auth/google/callback - Handle Google OAuth callback
router.get('/google/callback', async (req, res) => {
    const domain = await getDomain();
    try {
        const { code } = req.query;

        if (!code) {
            return res.redirect(`${domain}/login?error=oauth_failed`);
        }

        const { getGoogleUserInfo } = await import('../utils/googleAuth.js');
        const userInfo = await getGoogleUserInfo(code as string);

        // Find or create user
        let user = await User.findOne({ 'oauthProviders.google.id': userInfo.id });

        if (!user) {
            // Check if user exists with this email
            user = await User.findOne({ email: userInfo.email.toLowerCase() });

            if (user) {
                // Link Google account to existing user
                if (!user.oauthProviders) user.oauthProviders = {};
                user.oauthProviders.google = { id: userInfo.id, email: userInfo.email };
                await user.save();
            } else {
                // Create new user
                user = await User.create({
                    email: userInfo.email.toLowerCase(),
                    name: userInfo.name,
                    avatar: userInfo.picture,
                    passwordHash: crypto.randomBytes(32).toString('hex'), // Random password
                    emailVerified: true,
                    oauthProviders: {
                        google: { id: userInfo.id, email: userInfo.email }
                    },
                    credits: { balance: 500, membership: 500, bonus: 0, weekly: 0 }
                });
            }
        }

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

        res.redirect(`${domain}/dashboard?token=${token}`);
    } catch (error: any) {
        Logger.error('Google OAuth callback error:', error);
        res.redirect(`${domain}/login?error=oauth_failed`);
    }
});

// GET /api/auth/facebook - Initiate Facebook OAuth login
router.get('/facebook', async (req, res) => {
    const domain = await getDomain();
    try {
        const { getFacebookLoginUrl } = await import('../utils/facebookAuth.js');
        const url = await getFacebookLoginUrl();
        res.redirect(url);
    } catch (error: any) {
        Logger.error('Facebook OAuth initiation error:', error);
        res.redirect(`${domain}/login?error=oauth_failed`);
    }
});

// GET /api/auth/facebook/callback - Handle Facebook OAuth callback
router.get('/facebook/callback', async (req, res) => {
    const domain = await getDomain();
    try {
        await connectDB();
        const { code } = req.query;

        if (!code) {
            return res.redirect(`${domain}/login?error=oauth_failed`);
        }

        const { getFacebookUserInfo } = await import('../utils/facebookAuth.js');
        const userInfo = await getFacebookUserInfo(code as string);

        // Find or create user
        let user = await User.findOne({ 'oauthProviders.facebook.id': userInfo.id });

        if (!user) {
            // Check if user exists with this email
            user = await User.findOne({ email: userInfo.email.toLowerCase() });

            if (user) {
                // Link Facebook account to existing user
                if (!user.oauthProviders) user.oauthProviders = {};
                user.oauthProviders.facebook = { id: userInfo.id, email: userInfo.email };
                await user.save();
            } else {
                // Create new user
                user = await User.create({
                    email: userInfo.email.toLowerCase(),
                    name: userInfo.name,
                    avatar: userInfo.picture,
                    passwordHash: crypto.randomBytes(32).toString('hex'), // Random password
                    emailVerified: true,
                    oauthProviders: {
                        facebook: { id: userInfo.id, email: userInfo.email }
                    },
                    credits: { balance: 500, membership: 500, bonus: 0, weekly: 0 }
                });
            }
        }

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

        res.redirect(`${domain}/dashboard?token=${token}`);
    } catch (error: any) {
        Logger.error('Facebook OAuth callback error:', error);
        res.redirect(`${domain}/login?error=oauth_failed`);
    }
});

// GET /api/auth/oauth-config - Get enabled OAuth providers (public)
router.get('/oauth-config', async (req, res) => {
    try {
        await connectDB();
        const { getAdminSettings } = await import('../models/AdminSettings.js');
        const settings = await getAdminSettings();

        res.json({
            success: true,
            data: {
                google: settings?.apiConfigs?.oauth?.google?.enabled || false,
                facebook: settings?.apiConfigs?.oauth?.facebook?.enabled || false
            }
        });
    } catch (error: any) {
        Logger.error('OAuth config fetch error:', error);
        res.json({ success: true, data: { google: false, facebook: false } });
    }
})

// PATCH /api/auth/notification-settings
router.patch('/notification-settings', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB()

        const { taskCompletion, largeTaskReminder, email, push, inApp } = req.body

        const user = await User.findById(req.user!.userId)
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found' })
        }

        // Update notification settings
        if (taskCompletion !== undefined) user.notificationSettings.taskCompletion = taskCompletion
        if (largeTaskReminder !== undefined) user.notificationSettings.largeTaskReminder = largeTaskReminder
        if (email !== undefined) user.notificationSettings.email = email
        if (push !== undefined) user.notificationSettings.push = push
        if (inApp !== undefined) user.notificationSettings.inApp = inApp

        await user.save()

        res.json({
            success: true,
            data: {
                notificationSettings: user.notificationSettings
            }
        })

    } catch (error: any) {
        Logger.error('Update notification settings error:', error)
        res.status(500).json({ success: false, data: null, error: error.message || 'Failed to update notification settings' })
    }
})

export default router;
