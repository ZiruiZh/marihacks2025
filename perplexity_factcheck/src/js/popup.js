document.addEventListener('DOMContentLoaded', function() {
    const resultsContainer = document.getElementById('results');
    const loadingElement = document.getElementById('loading');

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'displayResults') {
            loadingElement.classList.add('hidden');
            displayResults(message.results);
        } else if (message.action === 'displayError') {
            loadingElement.classList.add('hidden');
            displayError(message.error);
        }
    });

    function displayResults(results) {
        resultsContainer.innerHTML = '';
        
        if (results.choices && results.choices.length > 0) {
            const content = results.choices[0].message.content;
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.textContent = content;
            resultsContainer.appendChild(resultItem);
        } else {
            displayError('No results found');
        }
    }

    function displayError(error) {
        resultsContainer.innerHTML = '';
        const errorElement = document.createElement('div');
        errorElement.className = 'error';
        errorElement.textContent = error;
        resultsContainer.appendChild(errorElement);
    }

    // Check if there's any selected text when popup opens
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getSelectedText'}, function(response) {
            if (response && response.text) {
                loadingElement.classList.remove('hidden');
                chrome.runtime.sendMessage({
                    action: 'factCheck',
                    text: response.text
                });
            }
        });
    });
});
