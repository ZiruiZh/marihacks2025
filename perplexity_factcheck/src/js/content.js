console.log('Content script loaded');

let lastSelectedText = '';

// Check if the extension context is still valid
function isExtensionValid() {
    try {
        // Try to access chrome.runtime, which throws if context is invalid
        if (chrome.runtime && chrome.runtime.id) {
            return true;
        }
    } catch (e) {
        console.log('Extension context invalidated, reloading page...');
        window.location.reload();
        return false;
    }
    return false;
}

// Function to remove existing floating button
function removeExistingButton() {
    const existingButton = document.getElementById('factcheck-button');
    if (existingButton) {
        existingButton.remove();
    }
}

// Function to create and show the button
function showButton(selectedText, rect) {
    // Remove any existing button first
    removeExistingButton();
    
    // Create the button
    const button = document.createElement('div');
    button.id = 'factcheck-button';
    
    // Set inline styles
    button.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        left: ${rect.left + (rect.width / 2) - 60}px;
        top: ${rect.top - 45}px;
        transform: translate(0, 0);
        background: linear-gradient(135deg,rgb(6, 5, 6),rgb(12, 12, 12));
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
        user-select: none;
        -webkit-user-select: none;
    `;
    
    // Set button content
    button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
        </svg>
        <span style="white-space: nowrap;">Fact Check</span>
    `;
    
    // Add click handler
    button.addEventListener('click', async () => {
        console.log('Button clicked, selected text:', selectedText);
        
        try {
            // First store the selected text and set initial state
            await chrome.storage.local.set({
                selectedText: selectedText,
                timestamp: Date.now(),
                status: 'analyzing'
            });

            // Send message to background script to handle popup opening and fact checking
            chrome.runtime.sendMessage({
                action: 'openPopup',
                forceOpen: true
            }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error opening popup:', chrome.runtime.lastError);
                    return;
                }

                // Remove the button after clicking
                removeExistingButton();
            });
        } catch (error) {
            console.error('Error:', error);
            removeExistingButton();
        }
    });
    
    // Add hover effects
    button.addEventListener('mouseover', () => {
        button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseout', () => {
        button.style.transform = 'scale(1)';
    });
    
    // Add to page
    document.body.appendChild(button);
}

// Handle text selection
document.addEventListener('mouseup', (e) => {
    try {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showButton(selectedText, rect);
        } else {
            removeExistingButton();
        }
    } catch (e) {
        console.error('Error handling selection:', e);
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

// Add handleFactCheck function
async function handleFactCheck(text) {
    console.log('handleFactCheck called with text:', text);
    
    if (!text || text.trim() === '') {
        console.error('Empty text provided to handleFactCheck');
        throw new Error('No text provided for fact checking');
    }

    const options = {
        method: 'POST',
        headers: {
            Authorization: 'Bearer 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',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "sonar",
            messages: [
                {
                    role: "system",
                    content: "You are a fact-checking assistant. Your response MUST be in the following format:\n\nTruth Percentage: [number]%\n\nContext: [2-3 sentence summary]\n\nSources:\n1. [URL]\n2. [URL]\n3. [URL]\n4. [URL]\n5. [URL]\n\nIMPORTANT: You MUST provide exactly 5 sources. Each source must be a valid URL. Do not include any additional text or explanations."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            max_tokens: 512,
            temperature: 0.2,
            top_p: 0.9,
            web_search_options: {
                search_context_size: "medium"
            }
        })
    };

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', options);
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected API response format:', data);
            throw new Error('Invalid API response format');
        }

        const result = data.choices[0].message.content;
        console.log('Extracted result:', result);
        
        // Parse the result into a structured format
        const lines = result.split('\n');
        const sources = [];
        
        // Find the sources section
        let inSourcesSection = false;
        for (const line of lines) {
            if (line.toLowerCase().includes('sources:')) {
                inSourcesSection = true;
                continue;
            }
            
            if (inSourcesSection) {
                const urlMatch = line.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                    sources.push(urlMatch[0].replace(/[.,]+$/, ''));
                }
            }
        }
        
        // Ensure we have exactly 5 sources
        if (sources.length !== 5) {
            throw new Error(`Expected 5 sources but got ${sources.length}`);
        }
        
        const parsedResult = {
            truthPercentage: parseInt(lines[0].match(/\d+/)[0]),
            context: lines[2].replace('Context: ', ''),
            sources: sources
        };
        
        return JSON.stringify(parsedResult);
    } catch (error) {
        console.error('Error in handleFactCheck:', error);
        throw error;
    }
}
