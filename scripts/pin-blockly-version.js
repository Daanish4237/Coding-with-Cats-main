// Pin Blockly CDN URLs to a specific version to avoid redirect overhead
const fs = require('fs');
const path = require('path');
const VERSION = '12.5.1';

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.html')) {
            let c = fs.readFileSync(full, 'utf8');
            let changed = false;

            // Pin to exact version
            if (c.includes('cdn.jsdelivr.net/npm/blockly/')) {
                c = c.replace(
                    /cdn\.jsdelivr\.net\/npm\/blockly\//g,
                    `cdn.jsdelivr.net/npm/blockly@${VERSION}/`
                );
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(full, c, 'utf8');
                console.log('Pinned:', full);
            }
        }
    }
}

walk('src');
console.log('Done.');
