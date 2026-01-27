const fs = require('fs');

function extractStrings(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error("File not found:", filePath);
            return;
        }
        const data = fs.readFileSync(filePath);
        let strings = [];
        let current = "";
        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            if (char >= 32 && char <= 126) {
                current += String.fromCharCode(char);
            } else {
                if (current.length >= 4) {
                    strings.push(current);
                }
                current = "";
            }
        }
        if (current.length >= 4) strings.push(current);
        console.log(strings.join('\n'));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

const target = process.argv[2];
if (target) extractStrings(target);
else console.log("Usage: node extract_strings.js <path>");
