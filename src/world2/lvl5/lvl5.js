// Level 10: BOSS FIGHT - Logic Master Battle!
import * as initialization from '../../initialization.js';

// Level configuration
const CURRENT_LEVEL = 10;
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
let bossLives = 3;
const MAX_LIVES = 3;
let bossDefeated = false;
let currentQuestion = 0;

const blocklyArea = document.getElementById('blocklyArea');
const blocklyDiv = document.getElementById('blocklyDiv');
const levelStartTime = Date.now();

// Questions reviewing World 2 topics: if/else, while loops, for loops, lists
const bossQuestions = [
    {
        question: "Level 6 Review (If/Else): Set x = 10. If x is greater than 5, print 'Big number', otherwise print 'Small number'.",
        hint: "Use an if/else block: if x > 5 → print 'Big number'",
        expectedOutput: "Big number",
        attackMessage: "Your conditional logic strikes true!"
    },
    {
        question: "Level 7 & 8 Review (Loops): Use a for loop to print the numbers 1 to 5, each on its own line.",
        hint: "Use for i in range(1, 6) and print i each iteration",
        expectedOutput: "1\n2\n3\n4\n5",
        attackMessage: "Your loop mastery deals massive damage!"
    },
    {
        question: "Level 9 Review (Lists): Create a list ['cat', 'dog', 'bird'] and print the first element.",
        hint: "Create the list and access index 0 to print 'cat'",
        expectedOutput: "cat",
        attackMessage: "Your list skills shatter the boss's shield!"
    },
    {
        question: "Combined Challenge: Use a for loop to print each number from 1 to 3. If the number equals 2, print 'Found it!' instead.",
        hint: "Loop range(1, 4), use if/else inside: if i == 2 print 'Found it!' else print i",
        expectedOutput: "1\nFound it!\n3",
        attackMessage: "You combined loops and logic — devastating!"
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

// Register custom blocks for World 2 topics
function registerCustomBlocks() {
    // Range block (from lvl3)
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

    // List block (from lvl4)
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

    if (!Blockly.Blocks['python_list_get']) {
        Blockly.Blocks['python_list_get'] = {
            init: function() {
                this.setColour(280);
                this.appendValueInput('LIST').setCheck('Array').appendField('get from');
                this.appendValueInput('INDEX').setCheck('Number').appendField('at index');
                this.setOutput(true, null);
                this.setTooltip('Get item from list at index');
            }
        };
        Blockly.Python.forBlock['python_list_get'] = function(block, generator) {
            const list = generator.valueToCode(block, 'LIST', generator.ORDER_MEMBER) || '[]';
            const index = generator.valueToCode(block, 'INDEX', generator.ORDER_MEMBER) || '0';
            return [`${list}[${index}]`, generator.ORDER_MEMBER];
        };
    }
}

// Full toolbox covering all World 2 topics
const toolboxLevel10 = {
    kind: 'categoryToolbox',
    contents: [
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
                { kind: 'block', type: 'python_list_with_elements' },
                { kind: 'block', type: 'python_list_get' }
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
        workspace = Blockly.inject(blocklyDiv, {
            toolbox: toolboxLevel10,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: false, wheel: false }, move: { scrollbars: true, drag: true, wheel: false }
        });
        console.log('Blockly initialized for Boss Level 10!');
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
            healthBar.style.background = 'linear-gradient(90deg, #7b1fa2, #ba68c8)';
            bossMessage.innerHTML = '"Impressive! But my logic is unbreakable!"';
        } else if (bossLives === 1) {
            healthBar.style.background = 'linear-gradient(90deg, #4a0072, #9c27b0)';
            bossMessage.innerHTML = '"IMPOSSIBLE! One more hit and I fall!"';
        } else {
            bossMessage.innerHTML = '"Answer correctly to defeat me!"';
        }
    }

    if (questionDisplay && currentQuestion < selectedQuestions.length) {
        questionDisplay.innerHTML = `
            <strong>🧠 Challenge ${currentQuestion + 1} of ${selectedQuestions.length}:</strong><br>
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
    bossMessage.innerHTML = '"IMPOSSIBLE! You have mastered all the logic! You are a true Logic Master!" 🎉🏆';
    bossMessage.style.color = '#ce93d8';

    const victoryDiv = document.createElement('div');
    victoryDiv.className = 'victory-animation';
    victoryDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.9); padding: 30px; border-radius: 20px;
                    text-align: center; z-index: 1000; border: 2px solid #9c27b0;">
            <h1 style="color: #ce93d8;">🏆 VICTORY! 🏆</h1>
            <p style="color: white;">You defeated the Logic Master!</p>
            <p style="color: #ce93d8;">You have mastered World 2!</p>
            <p style="color: #4CAF50;">Score: 100 points</p>
            <button onclick="this.parentElement.parentElement.remove()"
                    style="margin-top: 15px; padding: 10px 20px; background: #9c27b0; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Continue to World 3 →
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
        outputDiv.innerHTML = '🎉 The Logic Master is already defeated! Congratulations! 🎉';
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
        // Animate the blockly area on run
        const blocklyEl = document.getElementById('blocklyArea') || document.getElementById('blocklyDiv');
        if (blocklyEl) {
            blocklyEl.style.transition = 'box-shadow 0.15s ease';
            blocklyEl.style.boxShadow = '0 0 0 4px rgba(76,175,80,0.6), 0 0 24px rgba(76,175,80,0.3)';
            setTimeout(() => { blocklyEl.style.boxShadow = ''; }, 600);
        }
        runButton.textContent = '🧠 ATTACKING... 🧠';

        const code = Blockly.Python.workspaceToCode(workspace);
        outputDiv.innerHTML = '<strong>Your Code:</strong>\n' + code + '\n\n<strong>Result:</strong>\n';

        if (!code.trim()) {
            outputDiv.innerHTML += 'No code to run! Build your attack!';
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
                        🎉✨ ${damageMessage} CRITICAL HIT! ✨🎉<br>
                        ${result?.success ? `Score: 100 points<br>Rank: #${result.rank}<br>` : ''}
                        🌟 You have defeated THE LOGIC MASTER! 🌟<br>
                        You are now a World 2 Champion!
                    </div>
                `;

                bossDefeatedCelebration();
                localStorage.setItem('level10_completed', 'true');
                document.getElementById('nextPage').style.display = 'block';
                runButton.textContent = '🎉 VICTORY! 🎉';

            } else {
                // Move to next question
                currentQuestion++;
                updateBossUI();

                checkDiv.innerHTML = `
                    <div class="success-message">
                        🧠 ${damageMessage} HIT! 🧠<br>
                        The Logic Master has ${bossLives} lives remaining!<br>
                        Next challenge!
                    </div>
                `;

                workspace.clear();
            }

        } else {
            // INCORRECT ATTACK
            checkDiv.innerHTML = `
                <div class="error-message">
                    ❌ The Logic Master deflected your attack!<br>
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
            runButton.textContent = '🧠 ATTACK! Run Code 🧠';
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
        if (window.__hidePyodideOverlay) window.__hidePyodideOverlay();
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
    window.location.href = '../../../Quiz-project/leaderboard.html?world=2&level=10';
});
