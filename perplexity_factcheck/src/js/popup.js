document.addEventListener('DOMContentLoaded', function() {
    const highlightedContent = document.getElementById('highlightedContent');
    
    // Show loading immediately when popup opens
    showLoading();
    
    // Load saved text content when popup opens
    chrome.storage.local.get(['savedText', 'selectedText', 'results', 'status'], function(result) {
        if (result.savedText) {
            highlightedContent.textContent = result.savedText;
        } else if (result.selectedText) {
            highlightedContent.textContent = result.selectedText;
        }
        
        // If we have recent results, display them
        if (result.results && result.status === 'completed') {
            displayResults(result.results);
        }
    });

    // Add keydown event listener for Enter key
    highlightedContent.addEventListener('keydown', async function(e) {
        // Check if Enter was pressed without Shift (Shift+Enter allows for new lines)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent default Enter behavior
            const text = this.textContent.trim();
            
            if (text && text !== 'Highlight any text on the webpage to fact-check it') {
                showLoading(); // Show loading when sending
                
                try {
                    // Send message to background script and wait for response
                    const response = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({
                            action: 'factCheck',
                            text: text
                        }, response => {
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError);
                            } else if (response.error) {
                                reject(new Error(response.error));
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    
                    // Update the UI with the results
                    if (response.results) {
                        displayResults(response.results);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    displayError('Error processing the text. Please try again.');
                }
            }
        }
    });

    // Save text content when it changes
    highlightedContent.addEventListener('input', function() {
        const text = this.textContent.trim();
        chrome.storage.local.set({ 
            savedText: text,
            selectedText: text // Also update selectedText to maintain consistency
        });
    });

    // Add blur event handler for the editable content
    highlightedContent.addEventListener('blur', function() {
        const text = this.textContent.trim();
        if (!text) {
            // If the content is empty, restore the placeholder
            this.innerHTML = '<span class="placeholder">Highlight any text on the webpage to fact-check it</span>';
            chrome.storage.local.remove(['savedText', 'selectedText']);
        } else {
            // Otherwise, just keep the text content
            this.textContent = text;
            chrome.storage.local.set({ 
                savedText: text,
                selectedText: text // Also update selectedText to maintain consistency
            });
        }
    });

    // Add focus event handler to remove placeholder
    highlightedContent.addEventListener('focus', function() {
        const placeholder = this.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }
    });

    // Get all DOM elements
    const elements = {
        truthLabel: document.getElementById('truth-label'),
        percentageValue: document.getElementById('percentage-value'),
        highlightedContent: highlightedContent,
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

    // Update the message listener to handle text processing
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'displayResults') {
            displayResults(message.results);
        } else if (message.action === 'displayError') {
            hideLoading();
            displayError(message.error);
        } else if (message.action === 'updateSelectedText') {
            const highlightedContent = document.getElementById('highlightedContent');
            if (!highlightedContent.matches(':focus')) {
                highlightedContent.textContent = message.text;
                chrome.storage.local.set({ 
                    savedText: message.text,
                    selectedText: message.text
                });
            }
        }
    });

    function hideAll() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const resultsContent = document.getElementById('resultsContent');
        const errorContent = document.getElementById('errorContent');
        
        if (loadingIndicator) {
            loadingIndicator.classList.remove('visible');
            document.querySelector('.container').classList.remove('loading');
        }
        if (resultsContent) resultsContent.style.display = 'none';
        if (errorContent) errorContent.style.display = 'none';
    }

    function showLoading() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const container = document.querySelector('.container');
        const loadingText = loadingIndicator.querySelector('p');
        
        if (loadingIndicator && container) {
            // Update loading text
            if (loadingText) {
                loadingText.textContent = "Fact-checking information...";
            }
            
            // Show loading indicator
            loadingIndicator.classList.add('visible');
            container.classList.add('loading');
            
            // Update colors based on theme
            const isDarkMode = !document.documentElement.hasAttribute('data-theme') || 
                              document.documentElement.getAttribute('data-theme') !== 'light';
            
            const dots = loadingIndicator.querySelectorAll('.dot');
            dots.forEach(dot => {
                dot.style.backgroundColor = isDarkMode ? '#ffffff' : '#000000';
            });
            
            if (loadingText) {
                loadingText.style.color = isDarkMode ? '#ffffff' : '#000000';
            }
        }
    }

    function hideLoading() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const container = document.querySelector('.container');
        
        if (loadingIndicator && container) {
            loadingIndicator.classList.remove('visible');
            container.classList.remove('loading');
        }
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
            // Parse the JSON response if it's a string
            const parsedResults = typeof results === 'string' ? JSON.parse(results) : results;
            
            // Hide loading indicator
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

            // Store the results in local storage
            chrome.storage.local.set({
                results: results,
                status: 'completed',
                timestamp: Date.now()
            });
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

    function updateUIWithLatestData() {
        chrome.storage.local.get(['results', 'error', 'status', 'timestamp', 'selectedText'], function(data) {
            console.log('Updating UI with data:', data);
            
            if (data.selectedText && elements.highlightedContent) {
                elements.highlightedContent.textContent = data.selectedText;
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

    // Add event listener for the send button
    document.getElementById('sendButton').addEventListener('click', async () => {
        const highlightedContent = document.getElementById('highlightedContent');
        const text = highlightedContent.textContent.trim();
        
        if (text && text !== 'Highlight any text on the webpage to fact-check it') {
            showLoading(); // Show loading when sending
            
            try {
                // Send message to background script and wait for response
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        action: 'factCheck',
                        text: text
                    }, response => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else if (response.error) {
                            reject(new Error(response.error));
                        } else {
                            resolve(response);
                        }
                    });
                });
                
                // Update the UI with the results
                if (response.results) {
                    displayResults(response.results);
                }
            } catch (error) {
                console.error('Error:', error);
                displayError('Error processing the text. Please try again.');
            }
        }
    });
});
