const fs = require('fs');
const path = require('path');

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.html')) {
            let c = fs.readFileSync(full, 'utf8');
            let changed = false;

            // Switch unpkg Blockly to jsDelivr (faster, more reliable CDN)
            if (c.includes('unpkg.com/blockly')) {
                c = c.replace(
                    'https://unpkg.com/blockly/blockly.min.js',
                    'https://cdn.jsdelivr.net/npm/blockly/blockly.min.js'
                );
                c = c.replace(
                    'https://unpkg.com/blockly/python_compressed.js',
                    'https://cdn.jsdelivr.net/npm/blockly/python_compressed.js'
                );
                changed = true;
            }

            // Add preconnect hints for faster DNS resolution
            if (!c.includes('preconnect') && c.includes('cdn.jsdelivr.net')) {
                c = c.replace(
                    '<meta charset="UTF-8">',
                    '<meta charset="UTF-8">\n    <link rel="preconnect" href="https://cdn.jsdelivr.net">\n    <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">'
                );
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(full, c, 'utf8');
                console.log('Updated:', full);
            }
        }
    }
}

walk('src');
console.log('Done.');
