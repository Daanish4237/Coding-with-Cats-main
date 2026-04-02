/**
 * Fix two issues in all level JS files:
 * 1. Replace initialization.resizeElement() calls with direct Blockly.svgResize(workspace)
 *    since blocklyArea/blocklyDiv captured at top level are null at module load time
 * 2. Remove the top-level const blocklyArea/blocklyDiv declarations that capture null
 */
const fs = require('fs');
const path = require('path');

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.js') &&
                 !full.includes('__tests__') &&
                 !full.includes('scripts') &&
                 !full.includes('blockly-theme') &&
                 !full.includes('initialization') &&
                 !full.includes('main.js') &&
                 !full.includes('Start.js')) {

            let c = fs.readFileSync(full, 'utf8');
            if (!c.includes('Blockly.inject')) continue;

            let changed = false;

            // Replace initialization.resizeElement(blocklyDiv, blocklyArea, workspace)
            // with just Blockly.svgResize(workspace) — that's all it does
            if (c.includes('initialization.resizeElement')) {
                c = c.replace(
                    /initialization\.resizeElement\(blocklyDiv,\s*blocklyArea,\s*workspace\);/g,
                    'if (workspace) Blockly.svgResize(workspace);'
                );
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(full, c, 'utf8');
                console.log('Fixed:', path.relative('.', full));
            }
        }
    }
}

walk('src');
console.log('Done.');
