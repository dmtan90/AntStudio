import { Page } from 'playwright';
import { browserManager } from './BrowserManager.js';
import { AdminSettings } from '../../models/AdminSettings.js';

// Helper function to detect navigation elements
const isNavigationElement = (el: HTMLElement): boolean => {
    const text = el.innerText?.toLowerCase() || '';
    const className = el.className?.toLowerCase() || '';
    const id = el.id?.toLowerCase() || '';
    const tagName = el.tagName?.toLowerCase() || '';

    // Check for navigation keywords
    const navKeywords = ['skip to main', 'home', 'playground', 'menu', 'navigation', 'header', 'sidebar', 'toolbar', 'chevron'];
    const hasNavKeyword = navKeywords.some(keyword => text.includes(keyword) || className.includes(keyword) || id.includes(keyword));

    // Check for nav-related tags and attributes
    const isNavTag = ['nav', 'header', 'aside'].includes(tagName);
    const hasNavRole = el.getAttribute('role') === 'navigation' || el.getAttribute('role') === 'banner';

    return hasNavKeyword || isNavTag || hasNavRole;
};

export { isNavigationElement };
