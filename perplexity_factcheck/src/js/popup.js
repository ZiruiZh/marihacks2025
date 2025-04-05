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
        
        // Split the response into sections by line breaks
        const sections = results.split('\n').filter(section => section.trim() !== '');
        
        // First section should be the truth percentage
        const truthMatch = sections[0].match(/(\d+)%/);
        const truthPercentage = truthMatch ? truthMatch[1] : '--';
        
        // Second section should be the context paragraph
        const context = sections[1] || '';
        
        // Remaining sections should be the sources
        // Filter out any empty lines and the "Sources:" header if present
        const sources = sections.slice(2)
            .filter(line => line.trim() !== '' && !line.toLowerCase().includes('sources:'))
            .map(source => source.trim());

        // Update truth percentage
        if (elements.percentageValue) {
            elements.percentageValue.textContent = `${truthPercentage}%`;
        }
        if (elements.truthLabel) {
            elements.truthLabel.textContent = truthPercentage >= 70 ? 'True' : 'False';
        }

        // Update context content
        if (elements.contextContent) {
            elements.contextContent.textContent = context;
        }
        if (elements.contextDate) {
            elements.contextDate.textContent = new Date().toLocaleDateString();
        }

        // Update source bubbles
        sources.forEach(async (source, index) => {
            if (elements.sourceBubbles[index]) {
                const bubble = elements.sourceBubbles[index];
                const link = bubble.querySelector('a');
                if (link) {
                    // Extract URL from the source text
                    const urlMatch = source.match(/https?:\/\/[^\s]+/);
                    if (urlMatch) {
                        const url = urlMatch[0].replace(/[.,]+$/, ''); // Remove trailing periods or commas
                        link.href = url;
                        link.target = '_blank'; // Open in new tab
                        link.rel = 'noopener noreferrer'; // Security best practice
                        
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
        for (let i = sources.length; i < 5; i++) {
            if (elements.sourceBubbles[i]) {
                elements.sourceBubbles[i].style.display = 'none';
            }
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
});
