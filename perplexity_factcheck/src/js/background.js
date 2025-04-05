// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    
    if (message.action === 'factCheck') {
        handleFactCheck(message.text)
            .then(response => {
                console.log('Fact check completed successfully');
                chrome.runtime.sendMessage({
                    action: 'displayResults',
                    results: response
                });
            })
            .catch(error => {
                console.error('Fact check failed:', error);
                chrome.runtime.sendMessage({
                    action: 'displayError',
                    error: error.message
                });
            });
        return true;
    } else if (message.action === 'openPopup') {
        console.log('Opening popup...');
        chrome.action.openPopup();
    }
});

// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'factCheck',
            title: 'Fact Check with Perplexity',
            contexts: ['selection']
        });
    });
});

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
                    content: "Your response MUST contain ONLY the following: 1. Truth Percentage: Provide a single number followed immediately by a % sign (e.g., 85%) to represent the factual accuracy of the statement. (Treat any partially false statements as false.) 2. Summary: Summarize your research in a maximum of two sentences without footnotes nor bolding. 3. Sources: List the 5 most credible and relevant source URLs, separated by commas."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            max_tokens: 256,
            temperature: 0.2,
            top_p: 0.9,
            web_search_options: {
                search_context_size: "medium"
            }
        })
    };

    console.log('Making API request with options:', {
        ...options,
        body: JSON.parse(options.body) // Log the parsed body for better readability
    });

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
        return result;
    } catch (error) {
        console.error('Error in handleFactCheck:', error);
        throw error;
    }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'factCheck') {
        console.log('Context menu clicked with text:', info.selectionText);
        
        // Store the selected text and set initial state
        await chrome.storage.local.set({
            selectedText: info.selectionText,
            timestamp: Date.now(),
            status: 'analyzing'
        });

        try {
            // Try to open the popup
            await chrome.action.openPopup();
        } catch (error) {
            console.log('Could not open popup directly:', error);
            chrome.action.setBadgeText({ text: "!" });
            chrome.action.setBadgeBackgroundColor({ color: "#ff4593" });
            setTimeout(() => {
                chrome.action.setBadgeText({ text: "" });
            }, 3000);
        }

        try {
            // Call the API and store results
            const results = await handleFactCheck(info.selectionText);
            await chrome.storage.local.set({
                results: results,
                status: 'completed',
                timestamp: Date.now()
            });
            
            // Send message to update popup
            chrome.runtime.sendMessage({
                action: 'displayResults',
                results: results
            });
        } catch (error) {
            console.error('Fact check failed:', error);
            await chrome.storage.local.set({
                error: error.message,
                status: 'error',
                timestamp: Date.now()
            });
            
            // Send error message to popup
            chrome.runtime.sendMessage({
                action: 'displayError',
                error: error.message
            });
        }
    }
});
