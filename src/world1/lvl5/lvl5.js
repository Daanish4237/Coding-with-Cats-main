// Level 5: BOSS FIGHT - Code Cat Battle!
import * as initialization from '../../initialization.js';

// Level configuration
const CURRENT_LEVEL = 5;
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
let bossLives = 3;  // Boss has 3 lives
const MAX_LIVES = 3;
let bossDefeated = false;
let currentQuestion = 0;
let score = 0;

const blocklyArea = document.getElementById('blocklyArea');
const blocklyDiv = document.getElementById('blocklyDiv');
const levelStartTime = Date.now();

// Questions that test what they learned in World 1
const bossQuestions = [
    {
        question: "Level 1 Review: Print the magic word to attack!",
        hint: "Remember Level 1? Print exactly: PYTHON!!!!!!",
        expectedOutput: "PYTHON!!!!!!",
        attackMessage: "You cast a printing spell!"
    },
    {
        question: "Level 2 Review: Create a variable 'message' with 'Hello, Python!' and print it!",
        hint: "Create a variable and print it (like Level 2)",
        expectedOutput: "Hello, Python!",
        attackMessage: "You used variable magic!"
    },
    {
        question: "Level 3 Review: Convert '42' to integer and back to string, then print!",
        hint: "Use int() and str() like you learned in Level 3",
        expectedOutput: "42",
        attackMessage: "Your type conversion spell hits hard!"
    },
    {
        question: "Level 4 Review: Get user input and print 'Hello, [name]!' (use 'Alex' as input)",
        hint: "Use input() and print the greeting",
        expectedOutput: "Hello, Alex!",
        attackMessage: "You summoned the power of input!"
    }
];

// Get random questions (3 out of 4)
function getRandomQuestions() {
    // Shuffle questions array
    const shuffled = [...bossQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3); // Take 3 random questions
}

let selectedQuestions = getRandomQuestions();

// Define toolbox (includes all blocks from previous levels)
const toolboxLevel5 = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: '🖨️ Output',
            colour: '#4CAF50',
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
        },
        {
            kind: 'category',
            name: '📦 Variables',
            colour: '#5CA699',
            contents: [
                { kind: 'block', type: 'variables_set' },
                { kind: 'block', type: 'variables_get' }
            ]
        },
        {
            kind: 'category',
            name: '🔢 Numbers',
            colour: '#5C80A6',
            contents: [
                { kind: 'block', type: 'math_number' },
                { kind: 'block', type: 'math_arithmetic' }
            ]
        },
        {
            kind: 'category',
            name: '⚖️ Type Conversion',
            colour: '#A68B5C',
            contents: [
                { kind: 'block', type: 'python_int_conversion' },
                { kind: 'block', type: 'python_str_conversion' }
            ]
        },
        {
            kind: 'category',
            name: '⌨️ Input',
            colour: '#A65C5C',
            contents: [
                { kind: 'block', type: 'python_input' },
                { kind: 'block', type: 'python_input_prompt' }
            ]
        }
    ]
};

// Register custom blocks if not already registered
if (!Blockly.Blocks['python_int_conversion']) {
    Blockly.Blocks['python_int_conversion'] = {
        init: function() {
            this.setColour(165);
            this.appendValueInput('VALUE').setCheck(['Number', 'String']).appendField('int(');
            this.appendDummyInput().appendField(')');
            this.setOutput(true, 'Number');
            this.setTooltip('Convert value to integer');
        }
    };

    Blockly.Blocks['python_str_conversion'] = {
        init: function() {
            this.setColour(165);
            this.appendValueInput('VALUE').setCheck(['Number', 'String']).appendField('str(');
            this.appendDummyInput().appendField(')');
            this.setOutput(true, 'String');
            this.setTooltip('Convert value to string');
        }
    };

    Blockly.Blocks['python_input'] = {
        init: function() {
            this.setColour(210);
            this.appendDummyInput().appendField('input()');
            this.setOutput(true, 'String');
            this.setTooltip('Get user input');
        }
    };

    Blockly.Blocks['python_input_prompt'] = {
        init: function() {
            this.setColour(210);
            this.appendDummyInput()
                .appendField('input(')
                .appendField(new Blockly.FieldTextInput('Enter: '), 'PROMPT')
                .appendField(')');
            this.setOutput(true, 'String');
            this.setTooltip('Get user input with prompt');
        }
    };

    Blockly.Python.forBlock['python_int_conversion'] = function(block, generator) {
        const value = generator.valueToCode(block, 'VALUE', generator.ORDER_FUNCTION_CALL) || '0';
        return [`int(${value})`, generator.ORDER_FUNCTION_CALL];
    };

    Blockly.Python.forBlock['python_str_conversion'] = function(block, generator) {
        const value = generator.valueToCode(block, 'VALUE', generator.ORDER_FUNCTION_CALL) || "''";
        return [`str(${value})`, generator.ORDER_FUNCTION_CALL];
    };

    Blockly.Python.forBlock['python_input'] = function(block, generator) {
        return ['input()', generator.ORDER_FUNCTION_CALL];
    };

    Blockly.Python.forBlock['python_input_prompt'] = function(block, generator) {
        const prompt = block.getFieldValue('PROMPT');
        return [`input("${prompt}")`, generator.ORDER_FUNCTION_CALL];
    };
}

// Initialize Blockly
function initBlockly() {
    try {
        workspace = Blockly.inject(blocklyDiv, {
            toolbox: toolboxLevel5,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: true, wheel: true }
        });
        console.log('Blockly initialized for Boss Level!');
        return true;
    } catch (error) {
        console.error('Blockly error:', error);
        return false;
    }
}

// Update boss UI
function updateBossUI() {
    const healthBar = document.getElementById('bossHealthBar');
    const bossMessage = document.getElementById('bossMessage');
    const questionDisplay = document.getElementById('bossQuestion');
    
    if (healthBar) {
        const percent = (bossLives / MAX_LIVES) * 100;
        healthBar.style.width = `${percent}%`;
        healthBar.textContent = `${bossLives} / ${MAX_LIVES} Lives`;
        
        if (bossLives === 2) {
            healthBar.style.background = 'linear-gradient(90deg, #ff6600, #ff9966)';
            bossMessage.innerHTML = '"You\'re strong! But I still have more questions!"';
        } else if (bossLives === 1) {
            healthBar.style.background = 'linear-gradient(90deg, #ff0000, #ff3333)';
            bossMessage.innerHTML = '"NOOO! One more hit and I\'m defeated!"';
        } else {
            bossMessage.innerHTML = '"Answer correctly to defeat me!"';
        }
    }
    
    if (questionDisplay && currentQuestion < selectedQuestions.length) {
        questionDisplay.innerHTML = `
            <strong>⚔️ Challenge ${currentQuestion + 1} of ${selectedQuestions.length}:</strong><br>
            ${selectedQuestions[currentQuestion].question}
            <div class="hint-box" style="margin-top: 10px;">
                💡 ${selectedQuestions[currentQuestion].hint}
            </div>
        `;
    }
}

// Boss defeat celebration
function bossDefeatedCelebration() {
    const bossMessage = document.getElementById('bossMessage');
    bossMessage.innerHTML = '"NOOO! You have mastered all the lessons! Congratulations, young coder!" 🎉🏆';
    bossMessage.style.color = '#ffd700';
    
    const victoryDiv = document.createElement('div');
    victoryDiv.className = 'victory-animation';
    victoryDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: rgba(0,0,0,0.9); padding: 30px; border-radius: 20px; 
                    text-align: center; z-index: 1000;">
            <h1 style="color: gold;">🏆 VICTORY! 🏆</h1>
            <p style="color: white;">You defeated the Code Cat Boss!</p>
            <p style="color: #ff9800;">You have mastered World 1!</p>
            <p style="color: #4CAF50;">Score: 100 points</p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="margin-top: 15px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Continue to World 2 →
            </button>
        </div>
    `;
    document.body.appendChild(victoryDiv);
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
    const banner = document.getElementById('streak-banner');
    if (!banner) return;
    banner.classList.add('active');
    setTimeout(() => banner.classList.remove('active'), 2500);
}

// Run code (attack the boss)
async function runCode() {
    const outputDiv = document.getElementById('output');
    const runButton = document.getElementById('runButton');
    const checkDiv = document.getElementById('check');
    
    if (bossDefeated) {
        outputDiv.innerHTML = '🎉 The boss is already defeated! Congratulations! 🎉';
        return;
    }
    
    if (!workspace) {
        outputDiv.innerHTML = 'Blockly workspace not initialized.';
        return;
    }
    
    if (!pyodideReady || !pyodide) {
        outputDiv.innerHTML = '⏳ Python interpreter is loading. Prepare for battle...';
        return;
    }
    
    try {
        runButton.disabled = true;
        runButton.textContent = '⚔️ ATTACKING... ⚔️';
        
        // Generate Python code
        const code = Blockly.Python.workspaceToCode(workspace);
        outputDiv.innerHTML = '<strong>Your Code:</strong>\n' + code + '\n\n<strong>Result:</strong>\n';
        
        if (!code.trim()) {
            outputDiv.innerHTML += 'No code to run! Build your attack!';
            return;
        }
        
        // Setup Python to capture output
        const setupCode = `
        import sys
        from io import StringIO
        
        # Mock input for Level 4 questions
        original_input = input
        mock_inputs = ["Alex"]
        mock_index = 0
        
        def mock_input(prompt=""):
            global mock_index
            value = mock_inputs[mock_index % len(mock_inputs)]
            mock_index += 1
            return value
        
        input = mock_input
        
        stdout_capture = StringIO()
        sys.stdout = stdout_capture
        `;
        
        await pyodide.runPythonAsync(setupCode);
        
        try {
            await pyodide.runPythonAsync(code);
        } catch (pyError) {
            outputDiv.innerHTML += `\nYour spell backfired: ${pyError.message}`;
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ Syntax Error! Your code has an error.<br>
                    <small>${pyError.message}</small>
                </div>
            `;
            return;
        }
        
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
            outputDiv.innerHTML += 'No output produced';
        }
        
        // Check answer against current question
        const expectedOutput = selectedQuestions[currentQuestion].expectedOutput;
        const actualOutput = String(pythonOutputCode).trim();
        
        if (actualOutput === expectedOutput) {
            // CORRECT ATTACK!
            bossLives--;
            updateBossUI();
            
            const damageMessage = selectedQuestions[currentQuestion].attackMessage;
            
            if (bossLives <= 0) {
                // BOSS DEFEATED!
                bossDefeated = true;
                const result = await saveScoreToLeaderboard(CURRENT_LEVEL, 100);
                if (window.sfxVictory) window.sfxVictory.play().catch(() => {});
                if (window.showScoreReveal) window.showScoreReveal(result?.final_score ?? 100);
                
                checkDiv.innerHTML = `
                    <div class="success-message">
                        🎉✨ ${damageMessage} CRITICAL HIT! ✨🎉<br>
                        ${result?.success ? `Score: 100 points<br>Rank: #${result.rank}<br>` : ''}
                        🌟 You have defeated THE CODE CAT! 🌟<br>
                        You are now a Python Master!
                    </div>
                `;
                
                bossDefeatedCelebration();
                localStorage.setItem('level5_completed', 'true');
                document.getElementById('nextPage').style.display = 'block';
                runButton.textContent = '🎉 VICTORY! 🎉';
                
            } else {
                // Move to next question
                currentQuestion++;
                updateBossUI();
                
                checkDiv.innerHTML = `
                    <div class="success-message">
                        ⚔️ ${damageMessage} HIT! ⚔️<br>
                        The Code Cat has ${bossLives} lives remaining!<br>
                        Next challenge!
                    </div>
                `;
                
                // Clear workspace for next question
                workspace.clear();
            }
            
        } else {
            // INCORRECT ATTACK
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ The Code Cat dodged your attack!<br>
                    Expected: "${expectedOutput}"<br>
                    Got: "${actualOutput}"<br>
                    <small>💡 ${selectedQuestions[currentQuestion].hint}</small>
                </div>
            `;
        }
        
    } catch (error) {
        outputDiv.innerHTML += '\nError: ' + error.message;
        checkDiv.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    } finally {
        runButton.disabled = false;
        if (!bossDefeated) {
            runButton.textContent = '⚔️ ATTACK! Run Code ⚔️';
        }
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initBlockly();
    updateBossUI();
    setTimeout(() => {
        initialization.resizeElement(blocklyDiv, blocklyArea, workspace);
    }, 100);
});

window.addEventListener('load', async () => {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.innerHTML = '🔄 Loading Python interpreter... Preparing for battle!';
    
    try {
        pyodide = await loadPyodide();
        pyodideReady = true;
        loadingDiv.innerHTML = '✅ Python interpreter ready! Let the battle begin!';
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
    window.location.href = '../../../Quiz-project/leaderboard.html?world=1&level=5';
});