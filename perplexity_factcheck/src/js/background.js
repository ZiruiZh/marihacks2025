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
