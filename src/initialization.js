function resizeElement(blocklyDiv, blocklyArea, workspace) {
    // Compute the absolute coordinates and dimensions of blocklyArea
    let element = blocklyArea;
    let x = 0;
    let y = 0;
    do {
        x += element.offsetLeft;
        y += element.offsetTop;
        element = element.offsetParent;
    } while (element);
    
    // Position blocklyDiv over blocklyArea
    blocklyDiv.style.left = x + 'px';
    blocklyDiv.style.top = y + 'px';
    blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
    blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
    
    // Notify Blockly that its container size changed
    Blockly.svgResize(workspace);
}

// Initialize Pyodide
async function initPyodide(pyodideObject) {
    const loadingDiv = document.getElementById('loading');
    const runButton = document.getElementById('runButton');
    
    try {
        loadingDiv.style.display = 'block';
        loadingDiv.textContent = 'Loading Python interpreter...';
        
        // Load Pyodide - this downloads the WebAssembly Python runtime
        pyodideObject.pyodide = await loadPyodide();
        
        // Optional: Load common packages like micropip for additional libraries
        // await pyodide.loadPackage("micropip");
        
        pyodideObject.pyodideReady = true;
        if (window.__hidePyodideOverlay) window.__hidePyodideOverlay();
        runButton.disabled = false;
        runButton.textContent = 'Run Python Code';
        loadingDiv.style.display = 'none';
        
        console.log("Pyodide ready!");
    } catch (error) {
        loadingDiv.textContent = 'Failed to load Python interpreter: ' + error.message;
        console.error('Pyodide initialization failed:', error);
    }
}

async function runCode(pyodideObject, workspace, answerChecking) {
    const outputDiv = document.getElementById('output');
    const runButton = document.getElementById('runButton');
    const checkDiv = document.getElementById('check'); //this line of code is just debugging purpose, can remove once u dont need it
    
    if (!pyodideObject.pyodideReady || !pyodideObject.pyodide) { //this line of code is prob wrong
        outputDiv.innerHTML = 'Python interpreter not ready yet. Please wait.';
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
        
        // Generate Python code from the workspace
        const code = Blockly.Python.workspaceToCode(workspace);
        
        // Display the generated code
        outputDiv.innerHTML = '<strong>Generated Python Code:</strong>\n' + code + '\n\n<strong>Output:</strong>\n';
        
        if (!code.trim()) {
            outputDiv.innerHTML += 'No code to run.';
            return;
        }
        
        // Set up Python to capture print output
        const setupCode = `
        import sys
        from io import StringIO

        # Capture stdout
        stdout_capture = StringIO()
        sys.stdout = stdout_capture
        sys.stderr = StringIO()  # Also capture errors
        `;
        
        await pyodideObject.pyodide.runPythonAsync(setupCode);
        
        // Run the generated Python code
        await pyodideObject.pyodide.runPythonAsync(code);
        
        // Get the captured output
        const pythonOutputCode = await pyodideObject.pyodide.runPythonAsync(`
        result = stdout_capture.getvalue()
        # Restore stdout
        sys.stdout = sys.__stdout__
        result
        `);
        
        // Display the output
        if (pythonOutputCode) { //shud we display the output or nah? prob no need, but we see first
            outputDiv.innerHTML += pythonOutputCode;
        } else {
            outputDiv.innerHTML += 'Code executed successfully (no output)';
        }

        answerChecking(pythonOutputCode, checkDiv);
    } catch (error) {
        outputDiv.innerHTML += '\nError: ' + error.message;
    } finally {
        runButton.disabled = false;
        runButton.textContent = 'Run Python Code';
    }
}

// Start initializations when page loads
function startInit(blocklyDiv, blocklyArea, workspace, pyodideObject, answerChecking) {
    window.addEventListener('load', async () => {
        resizeElement(blocklyDiv, blocklyArea, workspace);
        await initPyodide(pyodideObject);
    });

    window.addEventListener('resize', () => { //this is needed when adding function that hv parameters into event listeners
        resizeElement(blocklyDiv, blocklyArea, workspace);
    });

    // Attach the run function to the button
    document.getElementById('runButton').addEventListener('click', () => {
        runCode(pyodideObject, workspace, answerChecking);
    });
}

export {startInit, resizeElement};