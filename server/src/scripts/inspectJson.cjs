const fs = require('fs');
const data = JSON.parse(fs.readFileSync('extracted___MODERN_ROUTER_DATA__.json', 'utf8'));

function findTracks(obj, path = '') {
    if (!obj) return;

    if (typeof obj === 'string' && (obj.startsWith('{') || obj.startsWith('['))) {
        try {
            const parsed = JSON.parse(obj);
            if (findTracks(parsed, `${path}(parsed)`)) return true;
        } catch (e) { }
    }

    if (typeof obj !== 'object') return;

    if (obj.tracks) {
        console.log(`FOUND tracks at: ${path}`);
        fs.writeFileSync('found_project_data.json', JSON.stringify(obj, null, 2));
        return true;
    }

    for (const [key, val] of Object.entries(obj)) {
        if (findTracks(val, `${path}.${key}`)) return true;
    }
    return false;
}

console.log('Searching for tracks in MODERN_ROUTER_DATA (with string parsing)...');
if (!findTracks(data)) {
    console.log('No tracks found in the object.');
}
