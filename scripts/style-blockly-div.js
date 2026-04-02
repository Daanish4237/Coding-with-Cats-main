const fs = require('fs');
const path = require('path');

const NEW_BLOCKLY_DIV = `#blocklyDiv {
            height: 420px;
            width: 100%;
            border: 2px solid #45475a;
            border-radius: 12px;
            position: absolute;
            top: 0;
            left: 0;
            box-shadow: 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
            overflow: hidden;
        }`;

const NEW_BLOCKLY_AREA = `#blocklyArea {
            position: relative;
            width: 100%;
            height: 420px;
            margin: 10px 0;
            border-radius: 12px;
        }`;

function replaceBlock(css, selector, replacement) {
    // Match selector { ... } with any whitespace/newlines inside
    const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*\\}', 'g');
    return css.replace(re, replacement);
}

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.html') && full.includes('src')) {
            let c = fs.readFileSync(full, 'utf8');
            if (!c.includes('id="blocklyDiv"')) continue;
            if (c.includes('box-shadow: 0 4px 24px')) continue;

            c = replaceBlock(c, '#blocklyDiv', NEW_BLOCKLY_DIV);
            c = replaceBlock(c, '#blocklyArea', NEW_BLOCKLY_AREA);

            fs.writeFileSync(full, c, 'utf8');
            console.log('Styled:', path.basename(path.dirname(full)) + '/' + e.name);
        }
    }
}

walk('src');
console.log('Done.');
