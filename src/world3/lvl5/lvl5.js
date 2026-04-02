// Level 15: ULTIMATE BOSS FIGHT — The Final Challenge!
import * as initialization from '../../initialization.js';

// Level configuration
const CURRENT_LEVEL = 15;
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
let bossLives = 3;
const MAX_LIVES = 3;
let bossDefeated = false;
let currentQuestion = 0;

const blocklyArea = document.getElementById('blocklyArea');
const blocklyDiv = document.getElementById('blocklyDiv');
const levelStartTime = Date.now();

// Questions covering all 3 worlds: variables/loops/conditionals (W1), lists/functions (W2), OOP/classes (W3)
const bossQuestions = [
    {
        question: "World 1 Review (Loops + Conditionals): Use a for loop over range(1, 6). If the number is even, print 'even'. If odd, print 'odd'.",
        hint: "Loop range(1,6), use if num % 2 == 0 to check even/odd",
        expectedOutput: "odd\neven\nodd\neven\nodd",
        attackMessage: "Your loop and conditional mastery strikes hard!"
    },
    {
        question: "World 2 Review (Lists + Loops): Create a list [10, 20, 30]. Use a for loop to print each element multiplied by 2.",
        hint: "Create list [10,20,30], loop over it, print item * 2 each iteration",
        expectedOutput: "20\n40\n60",
        attackMessage: "Your list and arithmetic skills deal massive damage!"
    },
    {
        question: "World 3 Review (OOP): Create a class called 'Hero' with a method 'battle_cry' that prints 'I will win!'. Create a Hero object and call battle_cry.",
        hint: "Define class Hero with def battle_cry(self): print('I will win!'), then create hero = Hero() and call hero.battle_cry()",
        expectedOutput: "I will win!",
        attackMessage: "Your OOP mastery shatters the boss's final shield!"
    },
    {
        question: "Ultimate Challenge (All Worlds): Create a class 'Counter' with a method 'count_up' that uses a for loop to print numbers 1 to 3. Create a Counter object and call count_up.",
        hint: "class Counter with def count_up(self): for i in range(1,4): print(i). Then c = Counter(), c.count_up()",
        expectedOutput: "1\n2\n3",
        attackMessage: "You combined OOP and loops — the ultimate technique!"
    }
];

// Pick 3 random questions from the pool
function getRandomQuestions() {
    const shuffled = [...bossQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 3);
}

let selectedQuestions = getRandomQuestions();

// Register custom blocks needed for all 3 worlds
function registerCustomBlocks() {
    // Range block
    if (!Blockly.Blocks['python_range']) {
        Blockly.Blocks['python_range'] = {
            init: function() {
                this.setColour(190);
                this.appendValueInput('STOP').setCheck('Number').appendField('range(');
                this.appendDummyInput().appendField(')');
                this.setOutput(true, 'Array');
                this.setTooltip('Generate a range of numbers from 0 to stop-1');
            }
        };
        Blockly.Python.forBlock['python_range'] = function(block, generator) {
            const value = generator.valueToCode(block, 'STOP', generator.ORDER_FUNCTION_CALL) || '1';
            return [`range(${value})`, generator.ORDER_FUNCTION_CALL];
        };
    }

    if (!Blockly.Blocks['python_range_start_stop']) {
        Blockly.Blocks['python_range_start_stop'] = {
            init: function() {
                this.setColour(190);
                this.appendValueInput('START').setCheck('Number').appendField('range(');
                this.appendValueInput('STOP').setCheck('Number').appendField(',');
                this.appendDummyInput().appendField(')');
                this.setOutput(true, 'Array');
                this.setTooltip('Generate a range from start to stop-1');
            }
        };
        Blockly.Python.forBlock['python_range_start_stop'] = function(block, generator) {
            const start = generator.valueToCode(block, 'START', generator.ORDER_FUNCTION_CALL) || '0';
            const stop = generator.valueToCode(block, 'STOP', generator.ORDER_FUNCTION_CALL) || '1';
            return [`range(${start}, ${stop})`, generator.ORDER_FUNCTION_CALL];
        };
    }

    // List block
    if (!Blockly.Blocks['python_list_with_elements']) {
        Blockly.Blocks['python_list_with_elements'] = {
            init: function() {
                this.setColour(280);
                this.appendValueInput('ITEM0').appendField('[');
                this.appendValueInput('ITEM1').appendField(',');
                this.appendValueInput('ITEM2').appendField(',');
                this.appendDummyInput().appendField(']');
                this.setOutput(true, 'Array');
                this.setTooltip('Create a list with three elements');
            }
        };
        Blockly.Python.forBlock['python_list_with_elements'] = function(block, generator) {
            const items = [];
            for (let i = 0; block.getInput(`ITEM${i}`); i++) {
                const value = generator.valueToCode(block, `ITEM${i}`, generator.ORDER_COMMA) || 'None';
                items.push(value);
            }
            return [`[${items.join(', ')}]`, generator.ORDER_ATOMIC];
        };
    }

    // Class definition block
    if (!Blockly.Blocks['python_class_def']) {
        Blockly.Blocks['python_class_def'] = {
            init: function() {
                this.setColour(260);
                this.appendDummyInput()
                    .appendField('class')
                    .appendField(new Blockly.FieldTextInput('MyClass'), 'NAME')
                    .appendField(':');
                this.appendStatementInput('BODY').appendField('');
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setTooltip('Define a class');
            }
        };
        Blockly.Python.forBlock['python_class_def'] = function(block, generator) {
            const name = block.getFieldValue('NAME');
            const body = generator.statementToCode(block, 'BODY');
            return `class ${name}:\n${body}`;
        };
    }

    // Method definition block
    if (!Blockly.Blocks['python_method_def']) {
        Blockly.Blocks['python_method_def'] = {
            init: function() {
                this.setColour(260);
                this.appendDummyInput()
                    .appendField('def')
                    .appendField(new Blockly.FieldTextInput('method_name'), 'NAME')
                    .appendField('(self):');
                this.appendStatementInput('BODY').appendField('');
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setTooltip('Define a method inside a class');
            }
        };
        Blockly.Python.forBlock['python_method_def'] = function(block, generator) {
            const name = block.getFieldValue('NAME');
            const body = generator.statementToCode(block, 'BODY');
            return `    def ${name}(self):\n${body}`;
        };
    }

    // Create object block
    if (!Blockly.Blocks['python_create_object']) {
        Blockly.Blocks['python_create_object'] = {
            init: function() {
                this.setColour(260);
                this.appendDummyInput()
                    .appendField('create')
                    .appendField(new Blockly.FieldTextInput('MyClass'), 'CLASS')
                    .appendField('object as')
                    .appendField(new Blockly.FieldTextInput('obj'), 'VAR');
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setTooltip('Create an object from a class');
            }
        };
        Blockly.Python.forBlock['python_create_object'] = function(block, generator) {
            const className = block.getFieldValue('CLASS');
            const varName = block.getFieldValue('VAR');
            return `${varName} = ${className}()\n`;
        };
    }

    // Call method block
    if (!Blockly.Blocks['python_call_method_on_var']) {
        Blockly.Blocks['python_call_method_on_var'] = {
            init: function() {
                this.setColour(260);
                this.appendDummyInput()
                    .appendField('call')
                    .appendField(new Blockly.FieldTextInput('obj'), 'VAR')
                    .appendField('.')
                    .appendField(new Blockly.FieldTextInput('method_name'), 'METHOD')
                    .appendField('()');
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setTooltip('Call a method on a named variable');
            }
        };
        Blockly.Python.forBlock['python_call_method_on_var'] = function(block, generator) {
            const varName = block.getFieldValue('VAR');
            const method = block.getFieldValue('METHOD');
            return `${varName}.${method}()\n`;
        };
    }

    // Modulo block
    if (!Blockly.Blocks['python_modulo']) {
        Blockly.Blocks['python_modulo'] = {
            init: function() {
                this.setColour(230);
                this.appendValueInput('A').setCheck('Number');
                this.appendValueInput('B').setCheck('Number').appendField('%');
                this.setOutput(true, 'Number');
                this.setTooltip('Remainder of A divided by B');
            }
        };
        Blockly.Python.forBlock['python_modulo'] = function(block, generator) {
            const a = generator.valueToCode(block, 'A', generator.ORDER_MULTIPLICATIVE) || '0';
            const b = generator.valueToCode(block, 'B', generator.ORDER_MULTIPLICATIVE) || '1';
            return [`${a} % ${b}`, generator.ORDER_MULTIPLICATIVE];
        };
    }
}

// Full toolbox covering all 3 worlds
const toolboxLevel15 = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: '🏛️ Classes',
            colour: 260,
            contents: [
                { kind: 'block', type: 'python_class_def' },
                { kind: 'block', type: 'python_method_def' },
                { kind: 'block', type: 'python_create_object' },
                { kind: 'block', type: 'python_call_method_on_var' }
            ]
        },
        {
            kind: 'category',
            name: '⚙️ Control',
            colour: 120,
            contents: [
                { kind: 'block', type: 'controls_if' },
                { kind: 'block', type: 'controls_ifelse' },
                { kind: 'block', type: 'controls_whileUntil' },
                { kind: 'block', type: 'controls_for' }
            ]
        },
        {
            kind: 'category',
            name: '🔀 Logic',
            colour: 210,
            contents: [
                { kind: 'block', type: 'logic_compare' },
                { kind: 'block', type: 'logic_operation' },
                { kind: 'block', type: 'logic_boolean' },
                { kind: 'block', type: 'logic_negate' }
            ]
        },
        {
            kind: 'category',
            name: '🔄 Range',
            colour: 190,
            contents: [
                { kind: 'block', type: 'python_range' },
                { kind: 'block', type: 'python_range_start_stop' }
            ]
        },
        {
            kind: 'category',
            name: '📋 Lists',
            colour: 280,
            contents: [
                { kind: 'block', type: 'python_list_with_elements' }
            ]
        },
        {
            kind: 'category',
            name: '📊 Math',
            colour: 230,
            contents: [
                { kind: 'block', type: 'math_number' },
                { kind: 'block', type: 'math_arithmetic' },
                { kind: 'block', type: 'python_modulo' }
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
        registerCustomBlocks();
        const gameTheme = createGameTheme();
        workspace = Blockly.inject(blocklyDiv, {
            theme: gameTheme,
            toolbox: toolboxLevel15,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: false, wheel: false, startScale: 0.9 },
            move: { scrollbars: { horizontal: true, vertical: true }, drag: true, wheel: false }
        });
        console.log('Blockly initialized for Ultimate Boss Level 15!');
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
            healthBar.style.background = 'linear-gradient(90deg, #c62828, #ef9a9a)';
            bossMessage.innerHTML = '"Impressive... but you cannot defeat me!"';
        } else if (bossLives === 1) {
            healthBar.style.background = 'linear-gradient(90deg, #7f0000, #e53935)';
            bossMessage.innerHTML = '"IMPOSSIBLE! One more hit and it\'s over!"';
        } else {
            bossMessage.innerHTML = '"You dare challenge me? Prove your mastery of ALL worlds!"';
        }
    }

    if (questionDisplay && currentQuestion < selectedQuestions.length) {
        questionDisplay.innerHTML = `
            <strong>🔥 Challenge ${currentQuestion + 1} of ${selectedQuestions.length}:</strong><br>
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
    bossMessage.innerHTML = '"IMPOSSIBLE! You have mastered ALL THREE WORLDS! You are the Ultimate Champion!" 🎉🏆🔥';
    bossMessage.style.color = '#ff8a65';

    const victoryDiv = document.createElement('div');
    victoryDiv.className = 'victory-animation';
    victoryDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.92); padding: 30px; border-radius: 20px;
                    text-align: center; z-index: 1000; border: 2px solid #e53935;">
            <h1 style="color: #ff8a65;">🏆 ULTIMATE VICTORY! 🏆</h1>
            <p style="color: white;">You defeated the Ultimate Challenger!</p>
            <p style="color: #ff8a65;">You have conquered ALL THREE WORLDS!</p>
            <p style="color: #4CAF50;">Score: 100 points</p>
            <button onclick="this.parentElement.parentElement.remove()"
                    style="margin-top: 15px; padding: 10px 20px; background: #e53935; color: white; border: none; border-radius: 5px; cursor: pointer;">
                🏠 Return to Hub
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
        outputDiv.innerHTML = '🎉 The Ultimate Challenger is already defeated! You are the champion! 🎉';
        return;
    }

    if (!workspace) {
        outputDiv.innerHTML = 'Blockly workspace not initialized.';
        return;
    }

    if (!pyodideReady || !pyodide) {
        outputDiv.innerHTML = '⏳ Python interpreter is loading. Prepare for the ultimate battle...';
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
        runButton.textContent = '🔥 ATTACKING... 🔥';

        const code = Blockly.Python.workspaceToCode(workspace);
        outputDiv.innerHTML = '<strong>Your Code:</strong>\n' + code + '\n\n<strong>Result:</strong>\n';

        if (!code.trim()) {
            outputDiv.innerHTML += 'No code to run! Build your ultimate attack!';
            return;
        }

        const setupCode = `
import sys
from io import StringIO
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
result
`);

        if (pythonOutputCode) {
            outputDiv.innerHTML += pythonOutputCode;
        } else {
            outputDiv.innerHTML += 'No output produced';
        }

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
                        🎉✨ ${damageMessage} ULTIMATE CRITICAL HIT! ✨🎉<br>
                        ${result?.success ? `Score: 100 points<br>Rank: #${result.rank}<br>` : ''}
                        🌟 You have defeated THE ULTIMATE CHALLENGER! 🌟<br>
                        You are the Champion of ALL THREE WORLDS!
                    </div>
                `;

                bossDefeatedCelebration();
                localStorage.setItem('level15_completed', 'true');
                document.getElementById('nextPage').style.display = 'block';
                runButton.textContent = '🏆 ULTIMATE VICTORY! 🏆';

            } else {
                // Move to next question
                currentQuestion++;
                updateBossUI();

                checkDiv.innerHTML = `
                    <div class="success-message">
                        🔥 ${damageMessage} HIT! 🔥<br>
                        The Ultimate Challenger has ${bossLives} lives remaining!<br>
                        Next challenge!
                    </div>
                `;

                workspace.clear();
            }

        } else {
            // INCORRECT ATTACK
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ The Ultimate Challenger deflected your attack!<br>
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
            runButton.textContent = '🔥 ATTACK! Run Code 🔥';
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
    loadingDiv.innerHTML = '🔄 Loading Python interpreter... Preparing for the ultimate battle!';

    try {
        pyodide = await loadPyodide();
        pyodideReady = true;
        if (window.__hidePyodideOverlay) window.__hidePyodideOverlay();
        loadingDiv.innerHTML = '✅ Python interpreter ready! Face the Ultimate Challenger!';
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
    window.location.href = '../../../Quiz-project/leaderboard.html?world=3&level=15';
});
