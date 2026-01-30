const fs = require('fs');

try {
    console.log('Reading file...');
    const html = fs.readFileSync('final_state.html', 'utf8');
    console.log(`HTML loaded, size: ${html.length}`);

    let pos = 0;
    let count = 0;
    while (true) {
        console.log(`Searching for script at pos: ${pos}`);
        const startIdx = html.indexOf('<script', pos);
        if (startIdx === -1) {
            console.log('No more script tags found.');
            break;
        }

        console.log(`Found <script at: ${startIdx}`);
        const tagEndIdx = html.indexOf('>', startIdx);
        if (tagEndIdx === -1) {
            console.log('Malformed script tag (no >)');
            break;
        }

        const endIdx = html.indexOf('</script>', tagEndIdx);
        if (endIdx === -1) {
            console.log('Malformed script tag (no </script>)');
            break;
        }

        count++;
        const tagHeader = html.slice(startIdx, tagEndIdx + 1);
        console.log(`[Script ${count}] Header: ${tagHeader.substring(0, 100)}`);
        const content = html.slice(tagEndIdx + 1, endIdx);

        if (content.includes('tracks') || content.includes('canvas_config')) {
            console.log(`[Script ${count}] FOUND interesting keys!`);
            const idMatch = tagHeader.match(/id="([^"]+)"/);
            const id = idMatch ? idMatch[1] : `script_${count}`;
            console.log(`Content length: ${content.length}`);

            if (content.length > 100) {
                fs.writeFileSync(`extracted_${id}.json`, content);
                console.log(`Saved to extracted_${id}.json`);
            }
        }

        pos = endIdx + 9;
    }
    console.log(`Done checking ${count} scripts.`);
} catch (err) {
    console.error('FATAL ERROR:', err);
}
