// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'factCheck',
        title: 'Fact Check with Perplexity',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'factCheck') {
        // Store the selected text
        await chrome.storage.local.set({
            selectedText: info.selectionText,
            timestamp: Date.now()
        });

        // Create popup window
        chrome.windows.create({
            url: chrome.runtime.getURL('src/popup.html'),
            type: 'popup',
            width: 400,
            height: 600,
            top: 0,
            left: (screen.width - 400)
        });

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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'factCheck') {
        handleFactCheck(message.text);
    }
    return true;
});

