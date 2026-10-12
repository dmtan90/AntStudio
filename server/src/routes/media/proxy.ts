// External media proxy (SSRF-guarded) (moved verbatim from routes/media.ts).
// Mounted by media.ts.
import { Router } from 'express';
import { Request, Response } from 'express';
import axios from 'axios';
import { assertPublicHttpUrl, safeHttpAgent, safeHttpsAgent } from '../../utils/ssrfGuard.js';
import { Logger } from '../../utils/Logger.js';
import { PROXY_MAX_BYTES } from './shared.js';

const router = Router();

// GET /api/media/proxy - Proxy external media to bypass CORS/CORP
router.get('/proxy', async (req: Request, res: Response) => {
    try {
        const url = req.query.url as string;
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL parameter is required' });
        }

        // SSRF guard: public http(s) hosts only (agents re-check every DNS lookup, including redirects)
        try {
            await assertPublicHttpUrl(url);
        } catch (e: any) {
            return res.status(400).json({ success: false, error: e.message });
        }

        // Use Axios stream to bypass undici native fetch proxy failures and respect environmental proxy settings
        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 15000,
            maxRedirects: 5,
            maxContentLength: PROXY_MAX_BYTES,
            httpAgent: safeHttpAgent,
            httpsAgent: safeHttpsAgent,
            validateStatus: () => true, // Forward any status code directly
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Never serve markup from our origin (would be XSS on the app domain)
        const contentType = String(response.headers['content-type'] || '');
        if (/text\/html|application\/xhtml\+xml/i.test(contentType)) {
            response.data.destroy();
            return res.status(415).json({ success: false, error: 'Unsupported content type' });
        }
        const declaredLength = Number(response.headers['content-length'] || 0);
        if (declaredLength > PROXY_MAX_BYTES) {
            response.data.destroy();
            return res.status(413).json({ success: false, error: 'Remote file too large' });
        }

        // Set Headers
        // Critical: Set CORP header to allow embedding in COEP environments
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");

        // Forward status code
        res.status(response.status);

        // Forward content type
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Stream the response body, aborting if it exceeds the size cap
        let streamedBytes = 0;
        response.data.on('data', (chunk: Buffer) => {
            streamedBytes += chunk.length;
            if (streamedBytes > PROXY_MAX_BYTES) response.data.destroy(new Error('Proxy size limit exceeded'));
        });
        response.data.on('error', () => res.destroy());
        res.on('close', () => response.data.destroy());
        response.data.pipe(res);

    } catch (error: any) {
        Logger.error('Proxy error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message || 'Proxy failed' });
        }
    }
});

export default router;
