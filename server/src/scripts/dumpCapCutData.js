import { chromium } from 'playwright';
import fs from 'fs';

async function dump() {
    const url = 'https://www.capcut.com/templates/Retro-Film-Aesthetic-Photodump-7314162910572367106?scene=category&template_scale=16%3A9&enter_from=first_page&from_page=template_page';
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        const data = await page.evaluate(() => {
            const next = document.getElementById('__NEXT_DATA__');
            if (next) return JSON.parse(next.innerText);

            // Try searching all scripts if not in __NEXT_DATA__
            const scripts = Array.from(document.querySelectorAll('script'));
            for (const s of scripts) {
                if (s.innerText.includes('tracks') && s.innerText.includes('clips')) {
                    return { found_in_script: true, raw: s.innerText.substring(0, 1000) };
                }
            }
            return { error: 'No data found' };
        });

        fs.writeFileSync('capcut_dump.json', JSON.stringify(data, null, 2));
        console.log('Dumped to capcut_dump.json');
    } catch (e) {
        console.error('Failed:', e);
    } finally {
        await browser.close();
    }
}

dump();
