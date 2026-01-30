const tests = [
    'https://www.canva.com/design/EAFoBFfYbuo/view',
    'https://www.canva.com/design/ABC-123/edit',
    'https://www.canva.com/templates/EAFoBFfYbuo-green-brown-yellow-animated-collage-summer-camp-video/',
    'https://www.canva.com/templates/XYZ567-my-template'
];

function extractDesignId(url) {
    const match = url.match(/(?:design\/([^/?]+)|templates\/([^/?-]+))/);
    if (!match) return '';
    return match[1] || match[2] || '';
}

tests.forEach(url => {
    console.log(`URL: ${url}`);
    console.log(`ID:  ${extractDesignId(url)}`);
    console.log('---');
});
