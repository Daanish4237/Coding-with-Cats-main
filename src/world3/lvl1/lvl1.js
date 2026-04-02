// World 3 - Level 11: Dictionaries
import * as initialization from '../../initialization.js';
import { createGameTheme } from '../../blockly-theme.js';

// Level configuration
const CURRENT_LEVEL = 11;
const CURRENT_WORLD = 3;

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

// Register custom dictionary blocks
Blockly.Blocks['python_dict_create'] = {
    init: function() {
        this.setColour(345);
        this.appendDummyInput().appendField('{ }');
        this.setOutput(true, 'Dictionary');
        this.setTooltip('Create an empty dictionary');
    }
};

Blockly.Blocks['python_dict_with_items'] = {
    init: function() {
        this.setColour(345);
        this.appendValueInput('KEY1').appendField('{');
        this.appendValueInput('VALUE1').appendField(':');
        this.appendDummyInput().appendField('}');
        this.setOutput(true, 'Dictionary');
        this.setTooltip('Create a dictionary with key-value pairs');
    }
};

Blockly.Blocks['python_dict_set'] = {
    init: function() {
        this.setColour(345);
        this.appendValueInput('DICT').setCheck('Dictionary').appendField('set in');
        this.appendValueInput('KEY').appendField('key');
        this.appendValueInput('VALUE').appendField('to');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Set a key-value pair in dictionary');
    }
};

Blockly.Blocks['python_dict_get'] = {
    init: function() {
        this.setColour(345);
        this.appendValueInput('DICT').setCheck('Dictionary').appendField('get from');
        this.appendValueInput('KEY').appendField('key');
        this.setOutput(true, null);
        this.setTooltip('Get value from dictionary by key');
    }
};

Blockly.Blocks['python_dict_keys'] = {
    init: function() {
        this.setColour(345);
        this.appendValueInput('DICT').setCheck('Dictionary').appendField('keys of');
        this.setOutput(true, 'Array');
        this.setTooltip('Get all keys from dictionary');
    }
};

Blockly.Blocks['python_dict_values'] = {
    init: function() {
        this.setColour(345);
        this.appendValueInput('DICT').setCheck('Dictionary').appendField('values of');
        this.setOutput(true, 'Array');
        this.setTooltip('Get all values from dictionary');
    }
};

// Python code generators for dictionary blocks
Blockly.Python.forBlock['python_dict_create'] = function(block, generator) {
    return ['{}', generator.ORDER_ATOMIC];
};

Blockly.Python.forBlock['python_dict_with_items'] = function(block, generator) {
    const key = generator.valueToCode(block, 'KEY1', generator.ORDER_MEMBER) || 'None';
    const value = generator.valueToCode(block, 'VALUE1', generator.ORDER_MEMBER) || 'None';
    return [`{${key}: ${value}}`, generator.ORDER_ATOMIC];
};

Blockly.Python.forBlock['python_dict_set'] = function(block, generator) {
    const dict = generator.valueToCode(block, 'DICT', generator.ORDER_MEMBER) || '{}';
    const key = generator.valueToCode(block, 'KEY', generator.ORDER_MEMBER) || 'None';
    const value = generator.valueToCode(block, 'VALUE', generator.ORDER_MEMBER) || 'None';
    const code = `${dict}[${key}] = ${value}\n`;
    return code;
};

Blockly.Python.forBlock['python_dict_get'] = function(block, generator) {
    const dict = generator.valueToCode(block, 'DICT', generator.ORDER_MEMBER) || '{}';
    const key = generator.valueToCode(block, 'KEY', generator.ORDER_MEMBER) || 'None';
    const code = `${dict}[${key}]`;
    return [code, generator.ORDER_MEMBER];
};

Blockly.Python.forBlock['python_dict_keys'] = function(block, generator) {
    const dict = generator.valueToCode(block, 'DICT', generator.ORDER_MEMBER) || '{}';
    const code = `list(${dict}.keys())`;
    return [code, generator.ORDER_FUNCTION_CALL];
};

Blockly.Python.forBlock['python_dict_values'] = function(block, generator) {
    const dict = generator.valueToCode(block, 'DICT', generator.ORDER_MEMBER) || '{}';
    const code = `list(${dict}.values())`;
    return [code, generator.ORDER_FUNCTION_CALL];
};

// Define toolbox
const toolboxLevel11 = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: '📚 Dictionaries',
            colour: 345,
            contents: [
                { kind: 'block', type: 'python_dict_create' },
                { kind: 'block', type: 'python_dict_with_items' },
                { kind: 'block', type: 'python_dict_set' },
                { kind: 'block', type: 'python_dict_get' },
                { kind: 'block', type: 'python_dict_keys' },
                { kind: 'block', type: 'python_dict_values' }
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
            name: '📊 Math',
            colour: 230,
            contents: [
                { kind: 'block', type: 'math_number' },
                { kind: 'block', type: 'math_arithmetic' }
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
            toolbox: toolboxLevel11,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: false, wheel: false, startScale: 0.9 },
            move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: false }
        });
        console.log('Blockly initialized for Level 11');
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
        
        const expectedOutput = "Alice";
        const actualOutput = String(pythonOutputCode).trim();
        
        if (actualOutput === expectedOutput) {
            const result = await saveScoreToLeaderboard(CURRENT_LEVEL, 100);
            
            if (result && result.success) {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job with dictionaries!<br>
                        Score: 100 points<br>
                        Rank: #${result.rank}<br>
                        🎉 Level 11 Complete!
                    </div>
                `;
            } else {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job with dictionaries!<br>
                        Score: 100 points<br>
                        🎉 Level 11 Complete!
                    </div>
                `;
            }
            
            localStorage.setItem('level11_completed', 'true');
            document.getElementById('nextPage').style.display = 'block';
            
        } else {
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ Not quite right!<br>
                    Expected: "${expectedOutput}"<br>
                    Got: "${actualOutput}"<br>
                    <small>💡 Hint: Create a dictionary with "name": "Alice" and print the value.</small>
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
        if (workspace) Blockly.svgResize(workspace);
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
        if (workspace) Blockly.svgResize(workspace);
    }
});

if (document.getElementById('runButton')) document.getElementById('runButton').addEventListener('click', runCode);
if (document.getElementById('leaderboardBtn')) document.getElementById('leaderboardBtn').addEventListener('click', () => {
    window.location.href = '../../../Quiz-project/leaderboard.html?world=3&level=11';
});