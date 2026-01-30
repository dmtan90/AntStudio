import { chromium } from 'playwright';
import fs from 'fs';

async function dumpHtml() {
    const url = 'https://www.capcut.com/editor-template/1673D40B-39B0-4688-A645-C1B72CAEDC2F?templateId=7314162910572367106';
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(10000); // Wait longer for dynamic content

        const html = await page.content();
        fs.writeFileSync('capcut_full.html', html);
        console.log('Dumped full HTML to capcut_full.html');
    } catch (e) {
        console.error('Failed:', e);
    } finally {
        await browser.close();
    }
}

dumpHtml();
