/**
 * Product Management Tools
 * Maps to: /api/commerce/products endpoints
 */

import { configService } from '~/utils/ConfigService.js';
import * as http from 'http';
import * as https from 'https';

// Helper to make authenticated API calls
export async function apiCall(
    method: string,
    path: string,
    body?: any,
    token?: string
): Promise<any> {
    const fetch = (await import('node-fetch')).default;
    const isHttps = configService.domain.startsWith('https');
    const agent = isHttps 
        ? new https.Agent({ rejectUnauthorized: false }) 
        : new http.Agent();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${configService.domain}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        agent
    });

    const data = await res.json() as any;
    return data;
}

// Active product state tracking for context-aware UI updates
let lastActiveProduct: any = null;

export function getLastActiveProduct() {
    return lastActiveProduct;
}

export function clearLastActiveProduct() {
    lastActiveProduct = null;
}

// Token storage (set by AgentChatService before each request)
let _authToken: string = '';
export function setAuthToken(token: string) { _authToken = token; }
function call(method: string, path: string, body?: any) {
    return apiCall(method, path, body, _authToken);
}

// ─── Product Tools ──────────────────────────────────────────

/**
 * List all products for the current user
 */
export async function listProducts(): Promise<any> {
    return call('GET', '/api/commerce/products');
}

/**
 * Get details of a single product
 */
export async function getProduct({ productId }: { productId: string }): Promise<any> {
    const res = await call('GET', `/api/commerce/products/${encodeURIComponent(productId)}/public`);
    if (res && res.success && res.data) {
        lastActiveProduct = res.data;
    }
    return res;
}

/**
 * Create a new product
 */
export async function createProduct({
    name,
    price,
    currency = 'VND',
    description,
    stock = 0,
    features,
}: {
    name: string;
    price: number;
    currency?: string;
    description?: string;
    stock?: number;
    features?: string[];
}): Promise<any> {
    const res = await call('POST', '/api/commerce/products', {
        name, price, currency, description, stock, features: features || []
    });
    if (res && res.success && res.data) {
        lastActiveProduct = res.data;
    }
    return res;
}

/**
 * Update an existing product
 */
export async function updateProduct({
    productId,
    name,
    price,
    currency,
    description,
    stock,
    isActive,
    features,
}: {
    productId: string;
    name?: string;
    price?: number;
    currency?: string;
    description?: string;
    stock?: number;
    isActive?: boolean;
    features?: string[];
}): Promise<any> {
    const res = await call('PUT', `/api/commerce/products/${encodeURIComponent(productId)}`, {
        name, price, currency, description, stock, isActive, features
    });
    if (res && res.success && res.data) {
        lastActiveProduct = res.data;
    }
    return res;
}

/**
 * Delete a product
 */
export async function deleteProduct({ productId }: { productId: string }): Promise<any> {
    return call('DELETE', `/api/commerce/products/${encodeURIComponent(productId)}`);
}


/**
 * Extract product info from a URL (e.g., Shopee, Lazada, Tiki)
 */
export async function extractProductFromUrl({ url }: { url: string }): Promise<any> {
    return call('POST', '/api/commerce/extract-product', { url });
}

/**
 * Get commerce analytics report
 */
export async function getCommerceReport({
    startDate,
    endDate,
}: {
    startDate?: string;
    endDate?: string;
}): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return call('GET', `/api/commerce/analytics/report?${params.toString()}`);
}

/**
 * Get commerce stats (total revenue, pending orders)
 */
export async function getCommerceStats(): Promise<any> {
    return call('GET', '/api/commerce/stats');
}
