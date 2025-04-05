let lastSelectedText = '';

// Function to handle text selection
function handleTextSelection() {
    const selectedText = window.getSelection().toString().trim();
    
    // Only process if the selection has changed
    if (selectedText && selectedText !== lastSelectedText) {
        lastSelectedText = selectedText;
        
        // Create a floating button near the selection
        showSelectionButton(selectedText);
        
        // Send the selected text to the extension
        chrome.runtime.sendMessage({
            action: 'updateSelection',
            text: selectedText
        });
    }
}

// Function to create and show the floating button
function showSelectionButton(selectedText) {
    // Remove any existing button
    removeExistingButton();
    
    if (!selectedText) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Create the button
    const button = document.createElement('div');
    button.id = 'factcheck-button';
    
    // Calculate position to ensure button is visible
    const buttonWidth = 120; // Approximate width of the button
    const buttonHeight = 36; // Approximate height of the button
    const spacing = 10; // Space between button and selection
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate initial position
    let leftPos = rect.left + (rect.width / 2) - (buttonWidth / 2);
    let topPos = rect.top - buttonHeight - spacing;
    
    // Adjust horizontal position if button would go outside viewport
    if (leftPos < spacing) {
        leftPos = spacing;
    } else if (leftPos + buttonWidth > viewportWidth - spacing) {
        leftPos = viewportWidth - buttonWidth - spacing;
    }
    
    // If button would go above viewport, place it below the selection
    if (topPos < spacing) {
        topPos = rect.bottom + spacing;
    }
    
    // Add scroll position to get absolute position
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
    
    // Animate button appearance
    const buttonElement = button.firstElementChild;
    requestAnimationFrame(() => {
        buttonElement.style.transform = 'scale(1)';
        buttonElement.style.opacity = '1';
    });
    
    // Add hover effect
    buttonElement.addEventListener('mouseover', () => {
        buttonElement.style.transform = 'scale(1.05)';
    });
    buttonElement.addEventListener('mouseout', () => {
        buttonElement.style.transform = 'scale(1)';
    });
    
    // Add click handler
    buttonElement.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'factCheck',
            text: selectedText
        });
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
    // Don't show the button if right-clicking
    if (e.button !== 2) {
        // Short delay to ensure selection is complete
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

// Listen for messages from the popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSelectedText') {
        sendResponse({ text: lastSelectedText });
    } else if (message.action === 'updateSelection') {
        lastSelectedText = message.text;
        // Don't show the floating button for context menu selections
    }
    return true;
});
