const fs = require('fs');
const path = require('path');

// Fix 1: Correct Blockly inject config — remove scrollbars from outer options,
// put everything inside a proper config object with no zoom
const OLD_ZOOM = `zoom: { controls: false, wheel: false }, move: { scrollbars: true, drag: true, wheel: false }`;
const NEW_ZOOM = `zoom: { controls: false, wheel: false, startScale: 0.9 },
            move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: false }`;

// Fix 2: Title CSS to inject into level HTML files
const TITLE_STYLE = `
        h1 {
            text-align: center;
            margin: 16px 20px 12px;
            font-size: 1.6em;
            font-weight: 900;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            color: #ffffff;
            text-shadow: 0 2px 8px rgba(0,0,0,0.55), 0 0 20px rgba(0,0,0,0.3);
            background: linear-gradient(135deg, rgba(0,0,0,0.45), rgba(0,0,0,0.25));
            padding: 10px 20px;
            border-radius: 12px;
            letter-spacing: 0.3px;
        }`;

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.js') && !full.includes('__tests__') && !full.includes('scripts')) {
            let c = fs.readFileSync(full, 'utf8');
            if (c.includes(OLD_ZOOM)) {
                c = c.replace(OLD_ZOOM, NEW_ZOOM);
                fs.writeFileSync(full, c, 'utf8');
                console.log('Fixed zoom:', full);
            }
        } else if (e.name.endsWith('.html') && full.includes('src')) {
            let c = fs.readFileSync(full, 'utf8');
            // Only add title style if it has an h1 and doesn't already have our style
            if (c.includes('<h1>') && !c.includes('text-shadow: 0 2px 8px')) {
                // Inject before </style> (first occurrence)
                c = c.replace('</style>', TITLE_STYLE + '\n        </style>');
                fs.writeFileSync(full, c, 'utf8');
                console.log('Fixed title:', full);
            }
        }
    }
}

walk('src');
console.log('Done.');
