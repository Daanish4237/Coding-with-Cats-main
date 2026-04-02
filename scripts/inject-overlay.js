const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const overlay = `
    <!-- Pyodide loading overlay -->
    <style>
        #pyodide-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.65);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 99999; color: white; font-family: sans-serif;
        }
        #pyodide-overlay .spinner {
            width: 52px; height: 52px; border: 5px solid rgba(255,255,255,0.2);
            border-top-color: #4CAF50; border-radius: 50%;
            animation: spin 0.8s linear infinite; margin-bottom: 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        #pyodide-overlay p { font-size: 1.1rem; font-weight: 600; margin: 0; }
    </style>
    <div id="pyodide-overlay">
        <div class="spinner"></div>
        <p>&#9881;&#65039; Loading Python engine&hellip;</p>
    </div>
    <script>
        window.__hidePyodideOverlay = function() {
            var el = document.getElementById('pyodide-overlay');
            if (el) {
                el.style.transition = 'opacity 0.4s';
                el.style.opacity = '0';
                setTimeout(function() { el.remove(); }, 400);
            }
        };
    </script>`;

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.html')) {
            let content = fs.readFileSync(full, 'utf8');
            if (content.includes('id="blocklyArea"') && !content.includes('pyodide-overlay')) {
                content = content.replace('</body>', overlay + '\n</body>');
                fs.writeFileSync(full, content, 'utf8');
                console.log('Overlay added:', full);
            }
        }
    }
}

walk('src');
console.log('Done.');
