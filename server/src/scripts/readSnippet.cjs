const fs = require('fs');
const content = fs.readFileSync('extracted___MODERN_ROUTER_DATA__.json', 'utf8');
console.log('File length:', content.length);
console.log('Head 1000:', content.substring(0, 1000));
const idx = content.indexOf('tracks');
if (idx !== -1) {
    console.log(`Found "tracks" at ${idx}`);
    console.log(content.substring(idx - 500, idx + 4500));
} else {
    console.log('Keyword "tracks" not found');
}
