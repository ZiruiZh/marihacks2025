import { handleFactCheck } from './background.js';
let lastSelectedText = '';

// Function to handle text selection
function handleTextSelection() {
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText && selectedText !== lastSelectedText) {
        lastSelectedText = selectedText;
        
        // Store the selected text
        chrome.storage.local.set({ selectedText: selectedText });
        
        // Create a floating button near the selection
        showSelectionButton(selectedText);
    }
}

// Function to create and show the floating button
function showSelectionButton(selectedText) {
    removeExistingButton();
    
    if (!selectedText) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const button = document.createElement('div');
    button.id = 'factcheck-button';
    
    const buttonWidth = 120;
    const buttonHeight = 36;
    const spacing = 10;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let leftPos = rect.left + (rect.width / 2) - (buttonWidth / 2);
    let topPos = rect.top - buttonHeight - spacing;
    
    if (leftPos < spacing) {
        leftPos = spacing;
    } else if (leftPos + buttonWidth > viewportWidth - spacing) {
        leftPos = viewportWidth - buttonWidth - spacing;
    }
    
    if (topPos < spacing) {
        topPos = rect.bottom + spacing;
    }
    
    leftPos += window.scrollX;
    topPos += window.scrollY;
    
    button.innerHTML = `
        <div style="
            position: fixed;
            z-index: 10000;
            background: linear-gradient(135deg, #6a11cb, #ff4593);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            transition: all 0.2s ease;
            left: ${leftPos}px;
            top: ${topPos}px;
            transform-origin: center bottom;
            transform: scale(0.95);
            opacity: 0;
        ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
            </svg>
            Fact Check
        </div>
    `;
    
    document.body.appendChild(button);
    
    const buttonElement = button.firstElementChild;
    requestAnimationFrame(() => {
        buttonElement.style.transform = 'scale(1)';
        buttonElement.style.opacity = '1';
    });
    
    buttonElement.addEventListener('mouseover', () => {
        buttonElement.style.transform = 'scale(1.05)';
    });
    
    buttonElement.addEventListener('mouseout', () => {
        buttonElement.style.transform = 'scale(1)';
    });
    
    buttonElement.addEventListener('click', async () => {
        console.log('Button clicked with text:', selectedText);
        
        // Store the selected text
        await chrome.storage.local.set({ 
            selectedText: selectedText,
            timestamp: Date.now()
        });
        console.log('Stored selected text in chrome.storage');
        
        // Call handleFactCheck directly with the selected text
        const results = await handleFactCheck(selectedText);
        console.log('Received results from handleFactCheck:', results);
        
        // Store the results
        await chrome.storage.local.set({ 
            results: results,
            timestamp: Date.now()
        });
        console.log('Stored results in chrome.storage');
        
        // Try to open the popup
        chrome.runtime.sendMessage({ action: 'openPopup' });
        console.log('Sent message to open popup');
        
        removeExistingButton();
    });
}

// Function to remove existing floating button
function removeExistingButton() {
    const existingButton = document.getElementById('factcheck-button');
    if (existingButton) {
        existingButton.remove();
    }
}

// Listen for text selection events
document.addEventListener('mouseup', (e) => {
    if (e.button !== 2) {
        setTimeout(() => {
            handleTextSelection();
        }, 10);
    }
});

// Remove button when clicking elsewhere
document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#factcheck-button')) {
        removeExistingButton();
    }
});

// Function to display fact-checking results
function displayResults(results) {
    // Remove any existing results
    removeExistingResults();
    
    // Parse the JSON response
    let parsedResults;
    try {
        parsedResults = JSON.parse(results);
    } catch (error) {
        console.error('Error parsing results:', error);
        displayError('Failed to parse fact-checking results');
        return;
    }
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'factcheck-results';
    resultsContainer.innerHTML = `
        <div style="
            position: fixed;
            z-index: 10000;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            max-width: 400px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        ">
            <h3 style="margin: 0 0 15px 0; color: #333;">Fact Check Results</h3>
            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Truth Percentage:</div>
                <div style="color: ${parsedResults.truthPercentage >= 70 ? '#4CAF50' : parsedResults.truthPercentage >= 40 ? '#FFC107' : '#F44336'}">
                    ${parsedResults.truthPercentage}%
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Context:</div>
                <div>${parsedResults.context}</div>
            </div>
            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Source Bias:</div>
                <div>Left: ${parsedResults.sources.left}% | Center: ${parsedResults.sources.center}% | Right: ${parsedResults.sources.right}%</div>
            </div>
            <div style="text-align: right;">
                <button style="
                    background: #6a11cb;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                " onclick="document.getElementById('factcheck-results').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(resultsContainer);
}

// Function to display errors
function displayError(error) {
    const errorContainer = document.createElement('div');
    errorContainer.id = 'factcheck-error';
    errorContainer.innerHTML = `
        <div style="
            position: fixed;
            z-index: 10000;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            max-width: 400px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        ">
            <h3 style="margin: 0 0 15px 0; color: #F44336;">Error</h3>
            <div style="margin-bottom: 15px;">${error}</div>
            <div style="text-align: right;">
                <button style="
                    background: #6a11cb;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                " onclick="document.getElementById('factcheck-error').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(errorContainer);
}

// Function to remove existing results
function removeExistingResults() {
    const existingResults = document.getElementById('factcheck-results');
    if (existingResults) {
        existingResults.remove();
    }
    const existingError = document.getElementById('factcheck-error');
    if (existingError) {
        existingError.remove();
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSelectedText') {
        sendResponse({ text: lastSelectedText });
    }
    return true;
});
