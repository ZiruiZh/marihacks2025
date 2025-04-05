// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'factCheck') {
        factCheckText(message.text)
            .then(response => {
                // Send the results back to the popup
                chrome.runtime.sendMessage({
                    action: 'displayResults',
                    results: response
                });
            })
            .catch(error => {
                console.error('Error:', error);
                chrome.runtime.sendMessage({
                    action: 'displayError',
                    error: error.message
                });
            });
    }
    return true;
});

async function factCheckText(text) {
    // TODO: Replace with your Perplexity API key
    const API_KEY = 'YOUR_PERPLEXITY_API_KEY';
    
    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'pplx-7b-online',
                messages: [{
                    role: 'user',
                    content: `Please fact-check the following statement and provide sources: ${text}`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Failed to fact-check: ' + error.message);
    }
}

// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    // Remove any existing context menu items first
    chrome.contextMenus.removeAll(() => {
        // Create the new context menu item
        chrome.contextMenus.create({
            id: 'factCheck',
            title: 'Fact Check with Perplexity',
            contexts: ['selection']
        });
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'factCheck') {
        console.log('Selected text:', info.selectionText);
        
        // Store the selected text
        try {
            await chrome.storage.local.set({
                selectedText: info.selectionText,
                timestamp: Date.now()
            });
            console.log('Text stored successfully');
            
            // Verify storage
            const stored = await chrome.storage.local.get(['selectedText']);
            console.log('Stored text:', stored.selectedText);
        } catch (error) {
            console.error('Error storing text:', error);
        }

        // Try to open the popup
        try {
            await chrome.action.openPopup();
        } catch (error) {
            console.log('Could not open popup programmatically:', error);
            // Set a badge to indicate there's text to analyze
            chrome.action.setBadgeText({ text: "!" });
            chrome.action.setBadgeBackgroundColor({ color: "#ff4593" });

            // Clear the badge after 3 seconds
            setTimeout(() => {
                chrome.action.setBadgeText({ text: "" });
            }, 3000);
        }

        // Start fact checking
        handleFactCheck(info.selectionText);
    }
});

async function handleFactCheck(text) {
    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR-API-KEY'
            },
            body: JSON.stringify({
                model: 'mixtral-8x7b-instruct',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a fact-checking assistant. For the given text, determine its truthfulness, provide context, and analyze source bias. Return a JSON object with the following structure: {"truthPercentage": number, "context": string, "date": string, "sources": {"left": number, "right": number, "center": number}}'
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const results = await response.json();
        
        // Store the results
        await chrome.storage.local.set({
            factCheckResults: results,
            factCheckError: null
        });

    } catch (error) {
        console.error('Fact-checking error:', error);
        
        // Store the error
        await chrome.storage.local.set({
            factCheckResults: null,
            factCheckError: error.message || 'Failed to fact-check the text'
        });
    }
}

