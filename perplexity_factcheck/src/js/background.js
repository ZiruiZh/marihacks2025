// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    
    if (message.action === 'factCheck') {
        handleFactCheck(message.text)
            .then(response => {
                console.log('Fact check completed successfully');
                sendResponse({ results: response });
            })
            .catch(error => {
                console.error('Fact check failed:', error);
                sendResponse({ error: error.message });
            });
        return true; // Keep the message channel open for async response
    } else if (message.action === 'openPopup') {
        console.log('Opening popup...');
        chrome.action.openPopup();
        return false;
    }
});

// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'factCheck',
            title: 'Fact Check with Truthly',
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
            
            // Send the selected text to the popup
            chrome.runtime.sendMessage({
                action: 'updateSelectedText',
                text: info.selectionText
            });

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
