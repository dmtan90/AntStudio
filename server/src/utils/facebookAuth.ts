import config from './config.js';
import { AdminSettings } from '../models/AdminSettings.js';

/**
 * Get Facebook OAuth authorization URL for login
 */
export const getFacebookLoginUrl = async (state?: string): Promise<string> => {
    const settings = await AdminSettings.findOne();
    const appId = settings?.apiConfigs?.social?.facebook?.appId || config.facebookAppId;

    if (!appId) {
        throw new Error('Facebook App ID not configured');
    }

    const redirectUri = `${config.public.baseUrl}/api/auth/facebook/callback`;
    const scope = 'email,public_profile';

    const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        scope: scope,
        response_type: 'code',
        ...(state && { state })
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
};

/**
 * Exchange authorization code for user info
 */
export const getFacebookUserInfo = async (code: string): Promise<{
    id: string;
    email: string;
    name: string;
    picture?: string;
}> => {
    const settings = await AdminSettings.findOne();
    const appId = settings?.apiConfigs?.social?.facebook?.appId || config.facebookAppId;
    const appSecret = settings?.apiConfigs?.social?.facebook?.appSecret || config.facebookAppSecret;

    if (!appId || !appSecret) {
        throw new Error('Facebook OAuth credentials not configured');
    }

    const redirectUri = `${config.public.baseUrl}/api/auth/facebook/callback`;

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${appId}&` +
        `client_secret=${appSecret}&` +
        `code=${code}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;

    const tokenResponse = await fetch(tokenUrl);

    if (!tokenResponse.ok) {
        throw new Error('Failed to exchange Facebook authorization code');
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get user info
    const userUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${accessToken}`;
    const userResponse = await fetch(userUrl);

    if (!userResponse.ok) {
        throw new Error('Failed to fetch Facebook user info');
    }

    const userInfo = await userResponse.json();

    return {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture?.data?.url
    };
};
