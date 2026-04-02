const fs = require('fs');
const path = require('path');

// Relative import path from each level JS to the theme file
// e.g. src/world1/lvl1/lvl1.js -> ../../blockly-theme.js
const THEME_IMPORT = `import { createGameTheme } from '../../blockly-theme.js';`;

// The theme option to add to Blockly.inject
const OLD_INJECT = `workspace = Blockly.inject(blocklyDiv, {`;
const NEW_INJECT = `const gameTheme = createGameTheme();
        workspace = Blockly.inject(blocklyDiv, {
            theme: gameTheme,`;

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.js') && !full.includes('__tests__') && !full.includes('scripts') && !full.includes('blockly-theme')) {
            let c = fs.readFileSync(full, 'utf8');

            // Only process level files that use Blockly.inject
            if (!c.includes('Blockly.inject')) continue;
            if (c.includes('createGameTheme')) continue; // already done

            // Add import at the top (after existing imports)
            c = c.replace(
                /^(import .+;\n)+/m,
                (match) => match + THEME_IMPORT + '\n'
            );

            // Add theme to inject call
            c = c.replace(OLD_INJECT, NEW_INJECT);

            fs.writeFileSync(full, c, 'utf8');
            console.log('Themed:', full);
        }
    }
}

walk('src');
console.log('Done.');
