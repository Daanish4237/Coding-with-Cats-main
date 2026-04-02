const fs = require('fs');
const path = require('path');

const ROOT_FAVICON = '<link rel="icon" href="/favicon.ico" type="image/x-icon">';
const REL_FAVICON  = '<link rel="icon" href="../../../favicon.ico" type="image/x-icon">';

const rootFiles = ['index.html', 'login.html', 'register.html', 'admin.html', 'shop.html', 'Quiz-project/leaderboard.html'];

rootFiles.forEach(f => {
    if (!fs.existsSync(f)) return;
    let c = fs.readFileSync(f, 'utf8');
    if (c.includes('favicon')) return;
    c = c.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n    ' + ROOT_FAVICON);
    fs.writeFileSync(f, c, 'utf8');
    console.log('Added favicon:', f);
});

function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.html')) {
            let c = fs.readFileSync(full, 'utf8');
            if (c.includes('favicon')) return;
            c = c.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n    ' + REL_FAVICON);
            fs.writeFileSync(full, c, 'utf8');
            console.log('Added favicon:', full);
        }
    }
}
walk('src');
console.log('Done.');
