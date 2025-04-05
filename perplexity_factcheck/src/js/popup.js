document.addEventListener('DOMContentLoaded', function() {
    // Get all DOM elements
    const elements = {
        truthLabel: document.getElementById('truth-label'),
        percentageValue: document.getElementById('percentage-value'),
        highlightedContent: document.getElementById('highlightedContent'),
        contextContent: document.getElementById('context-content'),
        contextDate: document.getElementById('context-date'),
        leftSources: document.getElementById('left-sources'),
        rightSources: document.getElementById('right-sources'),
        centerSources: document.getElementById('center-sources'),
        leftBias: document.getElementById('left-bias'),
        rightBias: document.getElementById('right-bias'),
        centerBias: document.getElementById('center-bias'),
        leftMeter: document.getElementById('left-meter'),
        rightMeter: document.getElementById('right-meter'),
        centerMeter: document.getElementById('center-meter'),
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

    function displayResults(results) {
        hideAll();
        
        // Parse the results string
        const truthMatch = results.match(/(\d+)%/);
        const truthPercentage = truthMatch ? truthMatch[1] : '--';
        
        // Split the results into sections (assuming format: "X% \n\n Summary \n\n Sources")
        const sections = results.split('\n\n');
        const summary = sections[1] || '';
        const sources = sections[2] ? sections[2].replace('Sources:', '').split(',').map(s => s.trim()) : [];

        // Update truth percentage
        if (elements.percentageValue) {
            elements.percentageValue.textContent = `${truthPercentage}%`;
        }
        if (elements.truthLabel) {
            elements.truthLabel.textContent = truthPercentage >= 70 ? 'True' : 'False';
        }

        // Update context content with just the summary
        if (elements.contextContent) {
            elements.contextContent.textContent = summary;
        }
        if (elements.contextDate) {
            elements.contextDate.textContent = new Date().toLocaleDateString();
        }

        // Update sources in their respective sections
        const sourceCount = sources.length;
        if (sourceCount > 0) {
            // Add sources header to context content
            if (elements.contextContent) {
                elements.contextContent.textContent = `${summary}\n\nSources:`;
            }

            // Distribute sources evenly
            const leftSources = sources.slice(0, Math.ceil(sourceCount/3));
            const centerSources = sources.slice(Math.ceil(sourceCount/3), Math.ceil(2*sourceCount/3));
            const rightSources = sources.slice(Math.ceil(2*sourceCount/3));

            if (elements.leftSources) {
                elements.leftSources.textContent = leftSources.join('\n');
            }
            if (elements.centerSources) {
                elements.centerSources.textContent = centerSources.join('\n');
            }
            if (elements.rightSources) {
                elements.rightSources.textContent = rightSources.join('\n');
            }
        }

        // Update bias meters (without percentage text)
        if (elements.leftMeter) {
            elements.leftMeter.style.width = '30%';
            if (elements.leftBias) elements.leftBias.textContent = '';
        }
        if (elements.centerMeter) {
            elements.centerMeter.style.width = '40%';
            if (elements.centerBias) elements.centerBias.textContent = '';
        }
        if (elements.rightMeter) {
            elements.rightMeter.style.width = '30%';
            if (elements.rightBias) elements.rightBias.textContent = '';
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
