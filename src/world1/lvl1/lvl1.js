// Level 1: Printing Text
import * as initialization from '../../initialization.js';
import { createGameTheme } from '../../blockly-theme.js';

// Level configuration
const CURRENT_LEVEL = 1;
const CURRENT_WORLD = 1;

// Get student ID
let studentId = sessionStorage.getItem('username');
if (!studentId) {
    studentId = localStorage.getItem('studentId') || 'Student_' + Math.random().toString(36).substr(2, 9);
}
localStorage.setItem('studentId', studentId);

// Global variables
let pyodide = null;
let pyodideReady = false;
let workspace = null;
const blocklyArea = document.getElementById('blocklyArea');
const blocklyDiv = document.getElementById('blocklyDiv');
const levelStartTime = Date.now();

// Define toolbox
const toolboxXml = `
    <xml xmlns="https://developers.google.com/blockly/xml">
        <block type="text_print"></block>
        <block type="text"></block>
    </xml>
`;

// Initialize Blockly
function initBlockly() {
    try {
        const gameTheme = createGameTheme();
        workspace = Blockly.inject(blocklyDiv, {
            theme: gameTheme,
            toolbox: toolboxXml,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: false, wheel: false, startScale: 0.9 },
            move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: false }
        });
        console.log('Blockly initialized');
        return true;
    } catch (error) {
        console.error('Blockly error:', error);
        return false;
    }
}

// Save score to leaderboard
async function saveScoreToLeaderboard(levelId, score) {
    try {
        const response = await fetch('/api/leaderboard/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stage_id: levelId,
                base_score: score,
                completion_time_ms: Date.now() - levelStartTime
            })
        });
        const result = await response.json();
        if (result.success) {
            console.log('Score saved! Rank:', result.rank);
            if (result.bonus_applied) {
                showStreakBanner();
            }
            return result;
        }
        return null;
    } catch (error) {
        console.error('Error saving score:', error);
        return null;
    }
}

function showStreakBanner() {
    const banner = document.createElement('div');
    banner.id = 'streak-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;animation:bounceIn 0.5s ease;';
    banner.innerHTML = '<div style="font-size:3rem;text-align:center;color:#fff;text-shadow:0 0 20px #ff6600;">🔥 Streak Bonus x1.5!</div>';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2500);
}

// Run code
async function runCode() {
    const outputDiv = document.getElementById('output');
    const runButton = document.getElementById('runButton');
    const checkDiv = document.getElementById('check');
    
    if (!workspace) {
        outputDiv.innerHTML = 'Blockly workspace not initialized.';
        return;
    }
    
    if (!pyodideReady || !pyodide) {
        outputDiv.innerHTML = '⏳ Python interpreter is loading. Please wait...';
        return;
    }
    
    try {
        runButton.disabled = true;
        // Animate the blockly area on run
        const blocklyEl = document.getElementById('blocklyArea') || document.getElementById('blocklyDiv');
        if (blocklyEl) {
            blocklyEl.style.transition = 'box-shadow 0.15s ease';
            blocklyEl.style.boxShadow = '0 0 0 4px rgba(76,175,80,0.6), 0 0 24px rgba(76,175,80,0.3)';
            setTimeout(() => { blocklyEl.style.boxShadow = ''; }, 600);
        }
        runButton.textContent = 'Running...';
        
        // Generate Python code
        const code = Blockly.Python.workspaceToCode(workspace);
        outputDiv.innerHTML = '<strong>Generated Python Code:</strong>\n' + code + '\n\n<strong>Output:</strong>\n';
        
        if (!code.trim()) {
            outputDiv.innerHTML += 'No code to run. Please add blocks to your workspace.';
            return;
        }
        
        // Setup Python to capture output
        const setupCode = `
        import sys
        from io import StringIO
        stdout_capture = StringIO()
        sys.stdout = stdout_capture
        `;
        
        await pyodide.runPythonAsync(setupCode);
        await pyodide.runPythonAsync(code);
        
        const pythonOutputCode = await pyodide.runPythonAsync(`
        result = stdout_capture.getvalue()
        sys.stdout = sys.__stdout__
        result
        `);
        
        // Display output
        if (pythonOutputCode) {
            outputDiv.innerHTML += pythonOutputCode;
        } else {
            outputDiv.innerHTML += 'Code executed successfully (no output)';
        }
        
        // Check answer
        const expectedOutput = "PYTHON!!!!!!";
        const actualOutput = String(pythonOutputCode).trim();
        
        if (actualOutput === expectedOutput) {
            // CORRECT!
            const result = await saveScoreToLeaderboard(CURRENT_LEVEL, 100);
            
            if (result && result.success) {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job on your first Python program!<br>
                        Score: 100 points<br>
                        Rank: #${result.rank}<br>
                        🎉 Level 1 Complete!
                    </div>
                `;
            } else {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job on your first Python program!<br>
                        Score: 100 points<br>
                        🎉 Level 1 Complete!
                    </div>
                `;
            }
            
            // Mark level as completed
            localStorage.setItem('level1_completed', 'true');
            document.getElementById('nextPage').style.display = 'block';
            
        } else {
            // INCORRECT
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ Not quite right!<br>
                    Expected: "${expectedOutput}"<br>
                    Got: "${actualOutput}"<br>
                    <small>💡 Hint: Make sure you're printing exactly "PYTHON!!!!!!" with all capital letters and 6 exclamation marks!</small>
                </div>
            `;
        }
        
    } catch (error) {
        outputDiv.innerHTML += '\nError: ' + error.message;
        checkDiv.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    } finally {
        runButton.disabled = false;
        runButton.textContent = 'Run Code';
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initBlockly();
    setTimeout(() => {
        initialization.resizeElement(blocklyDiv, blocklyArea, workspace);
    }, 100);
});

window.addEventListener('load', async () => {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.innerHTML = '🔄 Loading Python interpreter...';
    
    try {
        pyodide = await loadPyodide();
        pyodideReady = true;
        if (window.__hidePyodideOverlay) window.__hidePyodideOverlay();
        loadingDiv.innerHTML = '✅ Python interpreter ready!';
        setTimeout(() => {
            loadingDiv.innerHTML = '';
        }, 2000);
    } catch (error) {
        loadingDiv.innerHTML = '❌ Failed to load Python interpreter. Please refresh.';
        console.error(error);
    }
});

window.addEventListener('resize', () => {
    if (workspace) {
        initialization.resizeElement(blocklyDiv, blocklyArea, workspace);
    }
});

document.getElementById('runButton').addEventListener('click', runCode);
document.getElementById('leaderboardBtn').addEventListener('click', () => {
   window.location.href = '../../../Quiz-project/leaderboard.html?world=1&level=1';
});