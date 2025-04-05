document.addEventListener('DOMContentLoaded', function() {
    const truthLabel = document.getElementById('truth-label');
    const percentageValue = document.getElementById('percentage-value');
    const highlightedContent = document.getElementById('highlighted-content');
    const contextContent = document.getElementById('context-content');
    const contextDate = document.getElementById('context-date');
    const leftSources = document.getElementById('left-sources');
    const rightSources = document.getElementById('right-sources');
    const centerSources = document.getElementById('center-sources');
    const leftBias = document.getElementById('left-bias');
    const rightBias = document.getElementById('right-bias');
    const centerBias = document.getElementById('center-bias');
    const leftMeter = document.getElementById('left-meter');
    const rightMeter = document.getElementById('right-meter');
    const centerMeter = document.getElementById('center-meter');
    const loadingElement = document.getElementById('loading');
    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = document.querySelector('.theme-toggle-label');

    // Show loading screen immediately
    loadingElement.classList.remove('hidden');

    // Load saved theme preference
    chrome.storage.local.get(['theme'], function(result) {
        if (result.theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.checked = true;
            themeLabel.textContent = 'Dark';
        }
    });

    // Handle theme toggle
    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.setAttribute('data-theme', 'light');
            themeLabel.textContent = 'Dark';
            chrome.storage.local.set({ theme: 'light' });
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeLabel.textContent = 'Light';
            chrome.storage.local.set({ theme: 'dark' });
        }
    });

    // Check for stored text and results
    chrome.storage.local.get(['selectedText', 'results', 'error'], function(data) {
        console.log('Retrieved storage data:', data);
        
        if (data.selectedText) {
            console.log('Found selected text:', data.selectedText);
            updateHighlightedText(data.selectedText);
        }

        if (data.results) {
            console.log('Found results:', data.results);
            displayResults(data.results);
            loadingElement.classList.add('hidden');
        } else if (data.error) {
            console.log('Found error:', data.error);
            displayError(data.error);
            loadingElement.classList.add('hidden');
        }
    });

    // Function to update highlighted text with animation
    function updateHighlightedText(text) {
        const highlightedContent = document.getElementById('highlighted-content');
        if (highlightedContent) {
            highlightedContent.innerHTML = '';
            const textNode = document.createTextNode(text);
            highlightedContent.appendChild(textNode);
            console.log('Updated highlighted text');
        }
    }

    // Function to display results
    function displayResults(results) {
        // Update truth percentage
        const truthPercentage = document.getElementById('percentage-value');
        const truthLabel = document.getElementById('truth-label');
        if (truthPercentage && truthLabel) {
            truthPercentage.textContent = `${results.truth_percentage}%`;
            truthLabel.textContent = results.truth_label;
        }

        // Update context
        const contextContent = document.getElementById('context-content');
        if (contextContent) {
            contextContent.textContent = results.context;
        }

        // Update sources
        const leftSources = document.getElementById('left-sources');
        const rightSources = document.getElementById('right-sources');
        const centerSources = document.getElementById('center-sources');
        if (leftSources && rightSources && centerSources) {
            leftSources.textContent = results.left_sources.join('\n');
            rightSources.textContent = results.right_sources.join('\n');
            centerSources.textContent = results.center_sources.join('\n');
        }

        // Update bias meters
        const leftMeter = document.getElementById('left-meter');
        const rightMeter = document.getElementById('right-meter');
        const centerMeter = document.getElementById('center-meter');
        if (leftMeter && rightMeter && centerMeter) {
            leftMeter.style.transform = `scaleX(${results.left_bias / 100})`;
            rightMeter.style.transform = `scaleX(${results.right_bias / 100})`;
            centerMeter.style.transform = `scaleX(${results.center_bias / 100})`;
        }

        // Update bias percentages
        const leftBias = document.getElementById('left-bias');
        const rightBias = document.getElementById('right-bias');
        const centerBias = document.getElementById('center-bias');
        if (leftBias && rightBias && centerBias) {
            leftBias.textContent = `${results.left_bias}%`;
            rightBias.textContent = `${results.right_bias}%`;
            centerBias.textContent = `${results.center_bias}%`;
        }
    }

    // Function to display error
    function displayError(error) {
        const highlightedContent = document.getElementById('highlighted-content');
        if (highlightedContent) {
            highlightedContent.textContent = error;
        }
    }
});
