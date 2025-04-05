document.addEventListener('DOMContentLoaded', async function() {
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

    // Check for stored text and results when popup opens
    const data = await chrome.storage.local.get(['selectedText', 'factCheckResults', 'factCheckError']);
    
    if (data.selectedText) {
        updateHighlightedText(data.selectedText);
        
        // If we have results, display them
        if (data.factCheckResults) {
            displayResults(data.factCheckResults);
        } else if (data.factCheckError) {
            displayError(data.factCheckError);
        } else {
            // Show loading state if we have text but no results yet
            loadingElement.classList.remove('hidden');
        }
    }

    // Function to update highlighted text with animation
    function updateHighlightedText(text) {
        highlightedContent.innerHTML = '';
        if (text && text.trim()) {
            // Create container for text and copy button
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'flex-start';
            container.style.gap = '8px';
            
            // Animate the text appearance
            const textElement = document.createElement('div');
            textElement.textContent = text;
            textElement.style.opacity = '0';
            textElement.style.transform = 'translateY(10px)';
            textElement.style.transition = 'all 0.3s ease-out';
            textElement.style.flex = '1';
            container.appendChild(textElement);
            
            // Add copy button
            const copyButton = document.createElement('button');
            copyButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            `;
            copyButton.className = 'copy-button';
            copyButton.title = 'Copy text';
            copyButton.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 4px;
                padding: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-secondary);
                transition: all 0.2s ease;
            `;
            
            copyButton.addEventListener('mouseover', () => {
                copyButton.style.background = 'rgba(255, 255, 255, 0.2)';
                copyButton.style.color = 'var(--text-primary)';
            });
            
            copyButton.addEventListener('mouseout', () => {
                copyButton.style.background = 'rgba(255, 255, 255, 0.1)';
                copyButton.style.color = 'var(--text-secondary)';
            });
            
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(text).then(() => {
                    // Show feedback
                    const originalHTML = copyButton.innerHTML;
                    copyButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"></path>
                        </svg>
                    `;
                    copyButton.style.color = '#4CAF50';
                    
                    setTimeout(() => {
                        copyButton.innerHTML = originalHTML;
                        copyButton.style.color = 'var(--text-secondary)';
                    }, 1500);
                });
            });
            
            container.appendChild(copyButton);
            highlightedContent.appendChild(container);

            // Trigger animation
            setTimeout(() => {
                textElement.style.opacity = '1';
                textElement.style.transform = 'translateY(0)';
            }, 50);
        } else {
            const placeholder = document.createElement('span');
            placeholder.className = 'placeholder';
            placeholder.textContent = 'Highlight any text on the webpage to fact-check it';
            highlightedContent.appendChild(placeholder);
        }
    }

    // Function to animate a number from 0 to target
    function animateNumber(element, targetValue, duration = 1000) {
        let start = 0;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const current = Math.round(progress * targetValue);
            element.textContent = `${current}%`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    // Function to update meter fill based on bias
    function updateMeter(meterElement, bias, isLeft = true) {
        // For left-leaning sources, bias of 100 means full left, 0 means center
        // For right-leaning sources, bias of 100 means full right, 0 means center
        const scale = bias / 100;
        
        if (isLeft) {
            meterElement.style.transform = `scaleX(${scale})`;
        } else {
            meterElement.style.transform = `scaleX(${scale})`;
        }
    }

    // Function to update the truth percentage with animation
    function updateTruthPercentage(percentage) {
        animateNumber(percentageValue, percentage);

        // Update the truth label based on percentage
        if (percentage >= 80) {
            truthLabel.textContent = "very likely true";
        } else if (percentage >= 60) {
            truthLabel.textContent = "probably true";
        } else if (percentage >= 40) {
            truthLabel.textContent = "uncertain";
        } else if (percentage >= 20) {
            truthLabel.textContent = "probably false";
        } else {
            truthLabel.textContent = "very likely false";
        }
    }

    // Function to update sources and their bias percentages with animation
    function updateSources(sources) {
        if (sources.left) {
            leftSources.textContent = sources.left.sources.join(', ');
            animateNumber(leftBias, sources.left.bias);
            updateMeter(leftMeter, sources.left.bias, true);
            leftBias.style.opacity = '1';
        }
        if (sources.right) {
            rightSources.textContent = sources.right.sources.join(', ');
            animateNumber(rightBias, sources.right.bias);
            updateMeter(rightMeter, sources.right.bias, false);
            rightBias.style.opacity = '1';
        }
        if (sources.center) {
            centerSources.textContent = sources.center.sources.join(', ');
            animateNumber(centerBias, sources.center.bias);
            updateMeter(centerMeter, sources.center.bias);
            centerBias.style.opacity = '1';
        }

        // Add bias indicators to source labels
        updateSourceStyles(sources);
    }

    // Function to update source styles based on bias
    function updateSourceStyles(sources) {
        const categories = ['left', 'right', 'center'];
        categories.forEach(category => {
            if (sources[category]) {
                const bias = sources[category].bias;
                const element = document.querySelector(`.source-label.${category}`);
                
                // Update the intensity of the background color based on bias
                const alpha = 0.3 + (bias / 100) * 0.7; // Varies from 0.3 to 1.0
                
                if (category === 'left') {
                    element.style.backgroundColor = `rgba(106, 17, 203, ${alpha})`;
                } else if (category === 'right') {
                    element.style.backgroundColor = `rgba(255, 69, 147, ${alpha})`;
                } else {
                    element.style.backgroundColor = `rgba(255, 255, 255, ${alpha})`;
                }
            }
        });
    }

    function displayResults(results) {
        loadingElement.classList.add('hidden');
        
        if (results.choices && results.choices.length > 0) {
            try {
                // Parse the API response
                const response = JSON.parse(results.choices[0].message.content);
                
                // Update truth percentage
                updateTruthPercentage(response.truthPercentage);
                
                // Update context
                contextContent.textContent = response.context;
                contextDate.textContent = response.date || 'Recent';
                
                // Update sources and bias
                updateSources(response.sources);
            } catch (error) {
                displayError('Failed to parse API response');
            }
        } else {
            displayError('No results found');
        }
    }

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'displayResults') {
            displayResults(message.results);
        } else if (message.action === 'displayError') {
            loadingElement.classList.add('hidden');
            displayError(message.error);
        } else if (message.action === 'updateSelection') {
            updateHighlightedText(message.text);
        }
    });

    function displayError(error) {
        contextContent.innerHTML = '';
        const errorElement = document.createElement('div');
        errorElement.className = 'error';
        errorElement.textContent = error;
        contextContent.appendChild(errorElement);
        
        // Reset UI elements
        truthLabel.textContent = 'error';
        percentageValue.textContent = '--';
        contextDate.textContent = '';
        leftBias.textContent = '--%';
        rightBias.textContent = '--%';
        centerBias.textContent = '--%';
        
        // Reset meters
        leftMeter.style.transform = 'scaleX(0)';
        rightMeter.style.transform = 'scaleX(0)';
        centerMeter.style.transform = 'scaleX(0)';
    }
});
