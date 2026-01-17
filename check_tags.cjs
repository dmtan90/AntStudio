
const fs = require('fs');
const content = fs.readFileSync('d:\\Workspace\\Gits\\CamHub\\flova.ai\\pages\\projects\\[id]\\editor.vue', 'utf8');

const start = content.indexOf('<template>');
const end = content.lastIndexOf('</template>');

if (start === -1 || end === -1) {
    console.log("No template found");
    process.exit(1);
}

let templateContent = content.substring(start + 10, end);

// Remove comments
templateContent = templateContent.replace(/<!--[\s\S]*?-->/g, '');

const stack = [];
const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

// Regex for tags: < (/) (tagname) (attrs) (/) >
// Note: This matches <div ... > or <div ... /> or </div>
const tagRegex = /<(\/?)([\w-]+)([^>]*?)(\/?)>/g;

let match;
while ((match = tagRegex.exec(templateContent)) !== null) {
    const [fullMatch, slash1, tagName, attrs, slash2] = match;
    const isClose = slash1 === '/';
    const isSelfClose = slash2 === '/' || attrs.trim().endsWith('/');

    if (voidElements.includes(tagName.toLowerCase())) continue;
    if (isSelfClose) continue;

    if (isClose) {
        if (stack.length === 0) {
            console.log(`Error: Unexpected closing tag </${tagName}> at index ${match.index}`);
            process.exit(1);
        }

        const last = stack.pop();
        if (last !== tagName) {
            console.log(`Error: Mismatched tag. Expected closing </${last}> but found </${tagName}> at index ${match.index}`);
            console.log(`Context: ${templateContent.substring(Math.max(0, match.index - 50), match.index + 20)}`);
            process.exit(1);
        }
    } else {
        stack.push(tagName);
    }
}

if (stack.length > 0) {
    console.log(`Error: Unclosed tags: ${stack.join(', ')}`);
} else {
    console.log("Structure seems balanced");
}
