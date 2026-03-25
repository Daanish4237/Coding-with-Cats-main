// Level 4: Input Functions
import * as initialization from '../../initialization.js';

// Level configuration
const CURRENT_LEVEL = 4;
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

// ============ CUSTOM BLOCKS FOR LEVEL 4 ============

// Input block (no prompt)
Blockly.Blocks['python_input'] = {
    init: function() {
        this.setColour(210);
        this.appendDummyInput().appendField('input()');
        this.setOutput(true, 'String');
        this.setTooltip('Get user input');
    }
};

// Input block with prompt
Blockly.Blocks['python_input_prompt'] = {
    init: function() {
        this.setColour(210);
        this.appendDummyInput()
            .appendField('input(')
            .appendField(new Blockly.FieldTextInput('Enter: '), 'PROMPT')
            .appendField(')');
        this.setOutput(true, 'String');
        this.setTooltip('Get user input with prompt message');
    }
};

// Python code generators
Blockly.Python.forBlock['python_input'] = function(block, generator) {
    return ['input()', generator.ORDER_FUNCTION_CALL];
};

Blockly.Python.forBlock['python_input_prompt'] = function(block, generator) {
    const prompt = block.getFieldValue('PROMPT');
    return [`input("${prompt}")`, generator.ORDER_FUNCTION_CALL];
};

// ============ TOOLBOX CONFIGURATION ============

const toolboxLevel4 = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: '⌨️ Input',
            colour: '#A65C5C',
            contents: [
                { kind: 'block', type: 'python_input' },
                { kind: 'block', type: 'python_input_prompt' }
            ]
        },
        {
            kind: 'category',
            name: '📦 Variables',
            colour: '#5C9BA6',
            contents: [
                { kind: 'block', type: 'variables_set' },
                { kind: 'block', type: 'variables_get' }
            ]
        },
        {
            kind: 'category',
            name: '🖨️ Output',
            colour: '#5C9BA6',
            contents: [
                { kind: 'block', type: 'text_print' }
            ]
        },
        {
            kind: 'category',
            name: '🔤 Strings',
            colour: '#A65C7A',
            contents: [
                { kind: 'block', type: 'text' },
                { kind: 'block', type: 'text_join' }
            ]
        }
    ]
};

// Initialize Blockly
function initBlockly() {
    try {
        workspace = Blockly.inject(blocklyDiv, {
            toolbox: toolboxLevel4,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: true, wheel: true }
        });
        console.log('Blockly initialized for Level 4');
        return true;
    } catch (error) {
        console.error('Blockly error:', error);
        return false;
    }
}

// Save score to leaderboard
async function saveScoreToLeaderboard(levelId, score) {
    try {
        const response = await fetch('../../../Quiz-project/save_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                stage_id: levelId,
                score: score
            })
        });
        const result = await response.json();
        if (result.success) {
            console.log('Score saved! Rank:', result.rank);
            return result;
        }
        return null;
    } catch (error) {
        console.error('Error saving score:', error);
        return null;
    }
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
        runButton.textContent = 'Running...';
        
        // Generate Python code
        const code = Blockly.Python.workspaceToCode(workspace);
        outputDiv.innerHTML = '<strong>Generated Python Code:</strong>\n' + code + '\n\n<strong>Output:</strong>\n';
        
        if (!code.trim()) {
            outputDiv.innerHTML += 'No code to run. Please add blocks to your workspace.';
            return;
        }
        
        // For input, we need to simulate user input
        // We'll simulate "Alex" as the input for testing
        const setupCode = `
        import sys
        from io import StringIO
        
        # Mock input function for testing
        original_input = input
        mock_inputs = ["Alex"]
        mock_index = 0
        
        def mock_input(prompt=""):
            global mock_index
            print(prompt, end='')
            value = mock_inputs[mock_index]
            mock_index += 1
            return value
        
        input = mock_input
        
        # Capture output
        stdout_capture = StringIO()
        sys.stdout = stdout_capture
        `;
        
        await pyodide.runPythonAsync(setupCode);
        await pyodide.runPythonAsync(code);
        
        const pythonOutputCode = await pyodide.runPythonAsync(`
        result = stdout_capture.getvalue()
        sys.stdout = sys.__stdout__
        input = original_input
        result
        `);
        
        // Display output
        if (pythonOutputCode) {
            outputDiv.innerHTML += pythonOutputCode;
        } else {
            outputDiv.innerHTML += 'Code executed successfully (no output)';
        }
        
        // Check answer - should greet with "Hello, Alex!"
        const expectedOutput = "Hello, Alex!";
        const actualOutput = String(pythonOutputCode).trim();
        
        if (actualOutput === expectedOutput) {
            // CORRECT!
            const result = await saveScoreToLeaderboard(CURRENT_LEVEL, 100);
            
            if (result && result.success) {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job with input functions!<br>
                        Score: 100 points<br>
                        Rank: #${result.rank}<br>
                        🎉 Level 4 Complete!
                    </div>
                `;
            } else {
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ✅ Correct! Great job with input functions!<br>
                        Score: 100 points<br>
                        🎉 Level 4 Complete!
                    </div>
                `;
            }
            
            // Mark level as completed
            localStorage.setItem('level4_completed', 'true');
            document.getElementById('nextPage').style.display = 'block';
            
        } else {
            // INCORRECT
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ Not quite right!<br>
                    Expected: "${expectedOutput}"<br>
                    Got: "${actualOutput}"<br>
                    <small>💡 Hint: Ask "What is your name?" and print "Hello, [name]!"</small>
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
    window.location.href = '/CODING-WITH-CATS-MAIN/Quiz-project/leaderboard.html?world=1&level=4';
});