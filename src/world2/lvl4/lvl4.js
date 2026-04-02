// World 2, Level 4 (Level 9): Lists and Tuples
import * as initialization from '../../initialization.js';
import { createGameTheme } from '../../blockly-theme.js';

// Level configuration
const CURRENT_LEVEL = 9;
const CURRENT_WORLD = 2;

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

// Register custom list blocks
Blockly.Blocks['python_list_with_elements'] = {
    init: function() {
        this.setColour(280);
        this.appendValueInput('ITEM0').appendField('[');
        this.appendValueInput('ITEM1').appendField(',');
        this.appendValueInput('ITEM2').appendField(',');
        this.appendDummyInput().appendField(']');
        this.setOutput(true, 'Array');
        this.setTooltip('Create a list with elements');
    }
};

Blockly.Blocks['python_list_get'] = {
    init: function() {
        this.setColour(280);
        this.appendValueInput('LIST').setCheck('Array').appendField('get from');
        this.appendValueInput('INDEX').setCheck('Number').appendField('at index');
        this.setOutput(true, null);
        this.setTooltip('Get item from list at index');
    }
};

Blockly.Python.forBlock['python_list_with_elements'] = function(block, generator) {
    const items = [];
    let i = 0;
    while (block.getInput(`ITEM${i}`)) {
        const value = generator.valueToCode(block, `ITEM${i}`, generator.ORDER_COMMA) || 'None';
        items.push(value);
        i++;
    }
    const code = `[${items.join(', ')}]`;
    return [code, generator.ORDER_ATOMIC];
};

Blockly.Python.forBlock['python_list_get'] = function(block, generator) {
    const list = generator.valueToCode(block, 'LIST', generator.ORDER_MEMBER) || '[]';
    const index = generator.valueToCode(block, 'INDEX', generator.ORDER_MEMBER) || '0';
    const code = `${list}[${index}]`;
    return [code, generator.ORDER_MEMBER];
};

// Define toolbox
const toolboxLevel9 = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: '📋 Lists',
            colour: 280,
            contents: [
                { kind: 'block', type: 'python_list_with_elements' },
                { kind: 'block', type: 'python_list_get' }
            ]
        },
        {
            kind: 'category',
            name: '📝 Text',
            colour: 160,
            contents: [
                { kind: 'block', type: 'text' },
                { kind: 'block', type: 'text_print' }
            ]
        },
        {
            kind: 'category',
            name: '📦 Variables',
            colour: 330,
            custom: 'VARIABLE'
        }
    ]
};

// Initialize Blockly
function initBlockly() {
    try {
        const gameTheme = createGameTheme();
        workspace = Blockly.inject(blocklyDiv, {
            theme: gameTheme,
            toolbox: toolboxLevel9,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: false, wheel: false, startScale: 0.9 },
            move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: false }
        });
        console.log('Blockly initialized for World 2, Level 4');
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
        
        const code = Blockly.Python.workspaceToCode(workspace);
        outputDiv.innerHTML = '<strong>Generated Python Code:</strong>\n' + code + '\n\n<strong>Output:</strong>\n';
        
        if (!code.trim()) {
            outputDiv.innerHTML += 'No code to run. Please add blocks to your workspace.';
            return;
        }
        
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
        
        if (pythonOutputCode) {
            outputDiv.innerHTML += pythonOutputCode;
        } else {
            outputDiv.innerHTML += 'Code executed successfully (no output)';
        }
        
        const expectedOutput = "banana";
        const actualOutput = String(pythonOutputCode).trim();
        
        if (actualOutput === expectedOutput) {
            const result = await saveScoreToLeaderboard(CURRENT_LEVEL, 100);
            
            if (result && result.success) {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job with lists!<br>
                        Score: 100 points<br>
                        Rank: #${result.rank}<br>
                        🎉 Level 9 Complete!
                    </div>
                `;
            } else {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job with lists!<br>
                        Score: 100 points<br>
                        🎉 Level 9 Complete!
                    </div>
                `;
            }
            
            localStorage.setItem('level9_completed', 'true');
            document.getElementById('nextPage').style.display = 'block';
            
        } else {
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ Not quite right!<br>
                    Expected: "${expectedOutput}"<br>
                    Got: "${actualOutput}"<br>
                    <small>💡 Hint: Create a list ["apple", "banana", "orange"] and print the second element at index 1.</small>
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
    window.location.href = '../../../Quiz-project/leaderboard.html?world=2&level=9';
});