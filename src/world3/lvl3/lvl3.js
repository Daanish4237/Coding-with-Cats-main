// World 3 - Level 13: OOP Part 1 - Classes and Objects
import * as initialization from '../../initialization.js';
import { createGameTheme } from '../../blockly-theme.js';

// Level configuration
const CURRENT_LEVEL = 13;
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

// Register custom OOP blocks
Blockly.Blocks['python_class_def'] = {
    init: function() {
        this.setColour(260);
        this.appendDummyInput()
            .appendField('class')
            .appendField(new Blockly.FieldTextInput('MyClass'), 'NAME')
            .appendField(':');
        this.appendStatementInput('BODY')
            .appendField('');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Define a class');
    }
};

Blockly.Blocks['python_init_method'] = {
    init: function() {
        this.setColour(260);
        this.appendDummyInput()
            .appendField('def __init__(self):');
        this.appendStatementInput('BODY')
            .appendField('');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Constructor method');
    }
};

Blockly.Blocks['python_instance_var'] = {
    init: function() {
        this.setColour(260);
        this.appendDummyInput()
            .appendField('self.')
            .appendField(new Blockly.FieldTextInput('attribute'), 'ATTR')
            .appendField('=');
        this.appendValueInput('VALUE')
            .appendField('');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Set instance variable');
    }
};

Blockly.Blocks['python_method_def'] = {
    init: function() {
        this.setColour(260);
        this.appendDummyInput()
            .appendField('def')
            .appendField(new Blockly.FieldTextInput('method_name'), 'NAME')
            .appendField('(self):');
        this.appendStatementInput('BODY')
            .appendField('');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Define a method');
    }
};

Blockly.Blocks['python_create_object'] = {
    init: function() {
        this.setColour(260);
        this.appendDummyInput()
            .appendField('create')
            .appendField(new Blockly.FieldTextInput('MyClass'), 'CLASS')
            .appendField('object');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Create an object from a class');
    }
};

Blockly.Blocks['python_call_method'] = {
    init: function() {
        this.setColour(260);
        this.appendValueInput('OBJECT')
            .appendField('call');
        this.appendDummyInput()
            .appendField('.')
            .appendField(new Blockly.FieldTextInput('method_name'), 'METHOD')
            .appendField('()');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setTooltip('Call a method on an object');
    }
};

// Python code generators
Blockly.Python.forBlock['python_class_def'] = function(block, generator) {
    const name = block.getFieldValue('NAME');
    const body = generator.statementToCode(block, 'BODY');
    const code = `class ${name}:\n${body}`;
    return code;
};

Blockly.Python.forBlock['python_init_method'] = function(block, generator) {
    const body = generator.statementToCode(block, 'BODY');
    const code = `    def __init__(self):\n${body}`;
    return code;
};

Blockly.Python.forBlock['python_instance_var'] = function(block, generator) {
    const attr = block.getFieldValue('ATTR');
    const value = generator.valueToCode(block, 'VALUE', generator.ORDER_ASSIGNMENT) || 'None';
    const code = `    self.${attr} = ${value}\n`;
    return code;
};

Blockly.Python.forBlock['python_method_def'] = function(block, generator) {
    const name = block.getFieldValue('NAME');
    const body = generator.statementToCode(block, 'BODY');
    const code = `    def ${name}(self):\n${body}`;
    return code;
};

Blockly.Python.forBlock['python_create_object'] = function(block, generator) {
    const className = block.getFieldValue('CLASS');
    const code = `${className.toLowerCase()} = ${className}()\n`;
    return code;
};

Blockly.Python.forBlock['python_call_method'] = function(block, generator) {
    const obj = generator.valueToCode(block, 'OBJECT', generator.ORDER_MEMBER) || 'obj';
    const method = block.getFieldValue('METHOD');
    const code = `${obj}.${method}()\n`;
    return code;
};

// Define toolbox
const toolboxLevel13 = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: '📐 Class Definition',
            colour: 260,
            contents: [
                { kind: 'block', type: 'python_class_def' },
                { kind: 'block', type: 'python_init_method' }
            ]
        },
        {
            kind: 'category',
            name: '🔧 Attributes & Methods',
            colour: 260,
            contents: [
                { kind: 'block', type: 'python_instance_var' },
                { kind: 'block', type: 'python_method_def' }
            ]
        },
        {
            kind: 'category',
            name: '🎯 Object Creation',
            colour: 260,
            contents: [
                { kind: 'block', type: 'python_create_object' },
                { kind: 'block', type: 'python_call_method' }
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
            toolbox: toolboxLevel13,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: false, wheel: false, startScale: 0.9 },
            move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: false }
        });
        console.log('Blockly initialized for Level 13');
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
        
        const expectedOutput = "Woof!";
        const actualOutput = String(pythonOutputCode).trim();
        
        if (actualOutput === expectedOutput) {
            const result = await saveScoreToLeaderboard(CURRENT_LEVEL, 100);
            
            if (result && result.success) {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job with classes and objects!<br>
                        Score: 100 points<br>
                        Rank: #${result.rank}<br>
                        🎉 Level 13 Complete!
                    </div>
                `;
            } else {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job with classes and objects!<br>
                        Score: 100 points<br>
                        🎉 Level 13 Complete!
                    </div>
                `;
            }
            
            localStorage.setItem('level13_completed', 'true');
            document.getElementById('nextPage').style.display = 'block';
            
        } else {
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ Not quite right!<br>
                    Expected: "${expectedOutput}"<br>
                    Got: "${actualOutput}"<br>
                    <small>💡 Hint: Create a Dog class with name attribute and bark method that prints "Woof!"</small>
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

if (document.getElementById('runButton')) document.getElementById('runButton').addEventListener('click', runCode);
if (document.getElementById('leaderboardBtn')) document.getElementById('leaderboardBtn').addEventListener('click', () => {
    window.location.href = '../../../Quiz-project/leaderboard.html?world=3&level=13';
});