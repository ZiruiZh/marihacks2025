document.addEventListener('DOMContentLoaded', function() {
    // Get all DOM elements
    const elements = {
        truthLabel: document.getElementById('truth-label'),
        percentageValue: document.getElementById('percentage-value'),
        highlightedContent: document.getElementById('highlightedContent'),
        contextContent: document.getElementById('context-content'),
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
                if (elements.percentageValue) {
                    elements.percentageValue.textContent = '--%';
                }
                if (elements.truthLabel) {
                    elements.truthLabel.textContent = 'analyzing...';
                    elements.truthLabel.className = 'truth-label';
                }
            } else if (data.status === 'completed' && data.results && data.timestamp && (Date.now() - data.timestamp < 60000)) {
                displayResults(data.results);
            } else if (data.status === 'error' || data.error) {
                displayError(data.error || 'An error occurred during analysis');
            } else {
                // Initial state
                if (elements.percentageValue) {
                    elements.percentageValue.textContent = '--%';
                }
                if (elements.truthLabel) {
                    elements.truthLabel.textContent = 'analyzing...';
                    elements.truthLabel.className = 'truth-label';
                }
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
        const loadingIndicator = document.getElementById('loadingIndicator');
        const resultsContent = document.getElementById('resultsContent');
        const errorContent = document.getElementById('errorContent');
        
        if (loadingIndicator) loadingIndicator.classList.remove('visible');
        if (resultsContent) resultsContent.style.display = 'none';
        if (errorContent) errorContent.style.display = 'none';
    }

    function showLoading() {
        const container = document.querySelector('.container');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        // Add loading class to container to fade it out
        container.classList.add('loading');
        
        // Show loading indicator with animation
        requestAnimationFrame(() => {
            loadingIndicator.classList.add('visible');
        });
    }

    function hideLoading() {
        const container = document.querySelector('.container');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        // Hide loading indicator
        loadingIndicator.classList.remove('visible');
        
        // Wait for loading indicator to fade out before showing content
        setTimeout(() => {
            container.classList.remove('loading');
        }, 300);
    }

    async function fetchSourceTitle(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : null;
            
            // Create a temporary element to decode HTML entities
            const decoder = document.createElement('div');
            decoder.innerHTML = title;
            return decoder.textContent;
        } catch (error) {
            console.error('Error fetching title:', error);
            return null;
        }
    }

    function displayResults(results) {
        try {
            // Parse the JSON response
            const parsedResults = JSON.parse(results);
            
            // Hide loading with animation
            hideLoading();
            
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
                                .replace(/&gt;/g, '>')
                                .replace(/&#44;/g, ',')
                                .replace(/&#34;/g, '"')
                                .replace(/&#x27;/g, "'")
                                .replace(/&#x2C;/g, ',');
                            
                            link.href = url;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            
                            // Show the bubble
                            bubble.style.display = 'block';
                            
                            // Get the title part of the source (everything before the URL)
                            const titlePart = source.split(/https?:\/\//)[0].trim();
                            
                            // Create a temporary element to decode HTML entities in the title
                            const decoder = document.createElement('div');
                            decoder.innerHTML = titlePart;
                            const decodedTitle = decoder.textContent;
                            
                            try {
                                // If we have a title part, use it, otherwise fetch from URL
                                if (decodedTitle) {
                                    link.textContent = decodedTitle;
                                } else {
                                    const fetchedTitle = await fetchSourceTitle(url);
                                    link.textContent = fetchedTitle || url;
                                }
                                // Store the URL as a data attribute for reference
                                link.setAttribute('data-url', url);
                            } catch (error) {
                                console.error('Error handling title:', error);
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

    // Add event listeners for copy buttons
    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-copy-target');
            if (targetId) {
                copyToClipboard(targetId);
            }
        });
    });

    // Add event listeners for source copy buttons
    document.querySelectorAll('.copy-source-button').forEach(button => {
        button.addEventListener('click', function() {
            const sourceId = this.getAttribute('data-source-id');
            if (sourceId) {
                copySourceUrl(sourceId);
            }
        });
    });
});
