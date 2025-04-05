document.addEventListener('DOMContentLoaded', function() {
    // Get all DOM elements
    const elements = {
        truthLabel: document.getElementById('truth-label'),
        percentageValue: document.getElementById('percentage-value'),
        highlightedContent: document.getElementById('highlightedContent'),
        contextContent: document.getElementById('context-content'),
        contextDate: document.getElementById('context-date'),
        sourceBubbles: Array.from({ length: 5 }, (_, i) => document.getElementById(`source-${i + 1}`)),
        themeToggle: document.getElementById('theme-toggle'),
        themeLabel: document.querySelector('.theme-toggle-label'),
        resultsContent: document.getElementById('resultsContent'),
        errorContent: document.getElementById('errorContent'),
        loadingIndicator: document.getElementById('loadingIndicator')
    };

    // Log missing elements
    Object.entries(elements).forEach(([key, element]) => {
        if (!element) {
            console.error(`Element not found: ${key}`);
        }
    });

    // Load saved theme preference
    chrome.storage.local.get(['theme'], function(result) {
        if (result.theme === 'light' && elements.themeToggle && elements.themeLabel) {
            document.documentElement.setAttribute('data-theme', 'light');
            elements.themeToggle.checked = true;
            elements.themeLabel.textContent = 'Dark';
        }
    });

    // Handle theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.documentElement.setAttribute('data-theme', 'light');
                if (elements.themeLabel) {
                    elements.themeLabel.textContent = 'Dark';
                }
                chrome.storage.local.set({ theme: 'light' });
            } else {
                document.documentElement.removeAttribute('data-theme');
                if (elements.themeLabel) {
                    elements.themeLabel.textContent = 'Light';
                }
                chrome.storage.local.set({ theme: 'dark' });
            }
        });
    }

    // Function to update UI with latest data
    function updateUIWithLatestData() {
        chrome.storage.local.get(['selectedText', 'results', 'error', 'status', 'timestamp'], function(data) {
            console.log('Updating UI with data:', data);
            
            if (data.selectedText) {
                updateHighlightedText(data.selectedText);
            }

            if (data.status === 'analyzing') {
                showLoading();
            } else if (data.status === 'completed' && data.results && data.timestamp && (Date.now() - data.timestamp < 60000)) {
                displayResults(data.results);
            } else if (data.status === 'error' || data.error) {
                displayError(data.error || 'An error occurred during analysis');
            }
        });
    }

    // Update UI immediately when popup opens
    updateUIWithLatestData();

    // Set up a periodic check for updates (every 2 seconds)
    const updateInterval = setInterval(updateUIWithLatestData, 2000);

    // Clean up interval when popup closes
    window.addEventListener('unload', function() {
        clearInterval(updateInterval);
    });

    // Listen for real-time messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Popup received message:', message);
        
        if (message.action === 'displayResults') {
            displayResults(message.results);
        } else if (message.action === 'displayError') {
            displayError(message.error);
        }
    });

    function hideAll() {
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'none';
        if (elements.resultsContent) elements.resultsContent.style.display = 'none';
        if (elements.errorContent) elements.errorContent.style.display = 'none';
    }

    function showLoading() {
        hideAll();
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'block';
    }

    async function fetchSourceTitle(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            return titleMatch ? titleMatch[1].trim() : null;
        } catch (error) {
            console.error('Error fetching title:', error);
            return null;
        }
    }

    function displayResults(results) {
        hideAll();
        
        try {
            // Parse the JSON response
            const parsedResults = JSON.parse(results);
            
            // Update truth percentage
            if (elements.percentageValue) {
                elements.percentageValue.textContent = `${parsedResults.truthPercentage}%`;
            }
            if (elements.truthLabel) {
                elements.truthLabel.textContent = parsedResults.truthPercentage >= 70 ? 'True' : 'False';
                elements.truthLabel.className = `truth-label ${parsedResults.truthPercentage >= 70 ? 'true' : 'false'}`;
            }

            // Update context content
            if (elements.contextContent) {
                elements.contextContent.textContent = parsedResults.context;
            }
            if (elements.contextDate) {
                elements.contextDate.textContent = new Date().toLocaleDateString();
            }

            // Update source bubbles
            parsedResults.sources.forEach(async (source, index) => {
                if (elements.sourceBubbles[index]) {
                    const bubble = elements.sourceBubbles[index];
                    const link = bubble.querySelector('a');
                    if (link) {
                        // Extract URL from the source text and clean it
                        const urlMatch = source.match(/https?:\/\/[^\s]+/);
                        if (urlMatch) {
                            const url = urlMatch[0]
                                .replace(/[.,]+$/, '') // Remove trailing periods or commas
                                .replace(/&amp;/g, '&') // Replace HTML entities
                                .replace(/&quot;/g, '"')
                                .replace(/&#39;/g, "'")
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>');
                            
                            link.href = url;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            
                            // Show the bubble
                            bubble.style.display = 'block';
                            
                            // Fetch and set the title
                            try {
                                const title = await fetchSourceTitle(url);
                                // If we got a title, use it, otherwise use the URL
                                link.textContent = title || url;
                                // Store the URL as a data attribute for reference
                                link.setAttribute('data-url', url);
                            } catch (error) {
                                console.error('Error fetching title:', error);
                                link.textContent = url;
                            }
                        } else {
                            // If no URL found in this source, hide the bubble
                            bubble.style.display = 'none';
                        }
                    }
                }
            });

            // Hide any unused bubbles
            for (let i = parsedResults.sources.length; i < 5; i++) {
                if (elements.sourceBubbles[i]) {
                    elements.sourceBubbles[i].style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error parsing results:', error);
            displayError('Failed to parse fact-checking results');
        }
    }

    function displayError(error) {
        hideAll();
        if (elements.errorContent) {
            elements.errorContent.style.display = 'block';
            elements.errorContent.textContent = error;
        }
    }

    function updateHighlightedText(text) {
        if (elements.highlightedContent) {
            elements.highlightedContent.textContent = text;
        }
    }

    function copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        let textToCopy = '';

        if (elementId === 'sources-content') {
            // For sources, collect all source links
            const sources = element.querySelectorAll('.source-link');
            textToCopy = Array.from(sources)
                .map(link => link.href)
                .filter(href => href !== '#')
                .join('\n');
        } else {
            // For other sections, copy the text content
            textToCopy = element.textContent.trim();
        }

        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        
        // Select and copy the text
        textarea.select();
        document.execCommand('copy');
        
        // Remove the temporary element
        document.body.removeChild(textarea);

        // Show feedback
        const button = element.previousElementSibling.querySelector('.copy-button');
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>
        `;
        
        // Reset the button after 1 second
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 1000);
    }

    function copySourceUrl(sourceId) {
        const sourceBubble = document.getElementById(sourceId);
        if (!sourceBubble) return;
        
        const link = sourceBubble.querySelector('.source-link');
        if (!link || !link.href || link.href === '#') return;
        
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = link.href;
        document.body.appendChild(textarea);
        
        // Select and copy the text
        textarea.select();
        document.execCommand('copy');
        
        // Remove the temporary element
        document.body.removeChild(textarea);
        
        // Show feedback
        const button = sourceBubble.querySelector('.copy-source-button');
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>
        `;
        
        // Reset the button after 1 second
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 1000);
    }
});
