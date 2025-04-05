// Listen for text selection events
document.addEventListener('mouseup', function() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
        // Send the selected text to the background script
        chrome.runtime.sendMessage({
            action: 'factCheck',
            text: selectedText
        });
    }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSelectedText') {
        const selectedText = window.getSelection().toString().trim();
        sendResponse({ text: selectedText });
    }
    return true;
});
