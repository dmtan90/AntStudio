import config from './config.js';
import { AdminSettings } from '../models/AdminSettings.js';
import connectDB from './db.js';

const getDomain = async () => {
    await connectDB();
    const adminSettings = await AdminSettings.findOne();
    const settings = adminSettings?.whitelabel;
    const domain = adminSettings?.apiConfigs?.publicDomain;
    return domain || process.env.PUBLIC_BASE_URL || 'https://localhost:3000';
}

/**
 * Get Google OAuth 2.0 authorization URL for login
 */
export const getGoogleLoginUrl = async (state?: string): Promise<string> => {
    const settings = await AdminSettings.findOne();
    const clientId = settings?.apiConfigs?.oauth?.google?.clientId;
    const domain = await getDomain();

    if (!clientId) {
        throw new Error('Google Client ID not configured');
    }

    const redirectUri = `${domain}/api/auth/google/callback`;
    const scope = 'openid email profile';

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope,
        access_type: 'offline',
        prompt: 'consent',
        ...(state && { state })
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Exchange authorization code for user info
 */
export const getGoogleUserInfo = async (code: string): Promise<{
    id: string;
    email: string;
    name: string;
    picture?: string;
}> => {
    const settings = await AdminSettings.findOne();
    const clientId = settings?.apiConfigs?.oauth?.google?.clientId;
    const clientSecret = settings?.apiConfigs?.oauth?.google?.clientSecret;
    const domain = await getDomain();

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
    }

    const redirectUri = `${domain}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    if (!tokenResponse.ok) {
        throw new Error('Failed to exchange Google authorization code');
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userResponse.ok) {
        throw new Error('Failed to fetch Google user info');
    }

    const userInfo = await userResponse.json();

    return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
    };
};
