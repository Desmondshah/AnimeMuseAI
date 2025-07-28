// ANIMUSE AI BRUTALIST CHAT INTERFACE
// JavaScript functionality

class AnimuseBrutalistChat {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.charCount = document.getElementById('charCount');
        this.welcomeState = document.getElementById('welcomeState');
        this.messageCount = document.getElementById('messageCount');
        this.clearBtn = document.getElementById('clearBtn');
        
        this.chatHistory = [];
        this.isLoading = false;
        this.currentMode = 'general';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateCharCount();
        this.updateMessageCount();
    }

    bindEvents() {
        // Send button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter key to send (Shift+Enter for new line)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Character count update
        this.messageInput.addEventListener('input', () => this.updateCharCount());

        // Mode selector buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e));
        });

        // Prompt card clicks
        document.querySelectorAll('.prompt-card').forEach(card => {
            card.addEventListener('click', (e) => this.handlePromptClick(e));
        });

        // Clear chat button
        this.clearBtn.addEventListener('click', () => this.clearChat());
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count}/500`;
    }

    updateMessageCount() {
        const count = this.chatHistory.length;
        this.messageCount.textContent = count === 0 ? '0 MESSAGES' : `${count} MESSAGES`;
    }

    switchMode(e) {
        // Remove active class from all mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        e.target.closest('.mode-btn').classList.add('active');
        
        // Update current mode
        this.currentMode = e.target.closest('.mode-btn').dataset.mode;
    }

    handlePromptClick(e) {
        const prompt = e.target.closest('.prompt-card').dataset.prompt;
        this.messageInput.value = prompt;
        this.updateCharCount();
        this.messageInput.focus();
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isLoading) return;

        // Add user message
        this.addMessage('user', message);
        
        // Clear input
        this.messageInput.value = '';
        this.updateCharCount();
        
        // Hide welcome state
        this.hideWelcomeState();
        
        // Show loading and simulate AI response
        this.showLoadingMessage();
        this.simulateAIResponse(message);
    }

    addMessage(type, content, recommendations = null) {
        const messageId = Date.now().toString();
        const message = {
            id: messageId,
            type: type,
            content: content,
            recommendations: recommendations,
            timestamp: new Date()
        };

        this.chatHistory.push(message);
        this.renderMessage(message);
        this.updateMessageCount();
        this.scrollToBottom();
    }

    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${message.type}`;
        messageElement.innerHTML = this.getMessageHTML(message);
        
        this.messagesContainer.appendChild(messageElement);
    }

    getMessageHTML(message) {
        const timestamp = message.timestamp.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        let recommendationsHTML = '';
        if (message.recommendations && message.recommendations.length > 0) {
            recommendationsHTML = `
                <div class="recommendations">
                    <div class="recommendations-header">
                        <span>RECOMMENDATIONS</span>
                    </div>
                    ${message.recommendations.map((anime, idx) => `
                        <div class="anime-card">
                            <div class="anime-header">
                                <span class="anime-number">ANIME ${idx + 1}</span>
                                <span class="match-percentage">${Math.floor(Math.random() * 20 + 80)}% MATCH</span>
                            </div>
                            <h4 class="anime-title">${anime.title}</h4>
                            ${anime.year ? `<p class="anime-year">${anime.year}</p>` : ''}
                            <p class="anime-description">${anime.description}</p>
                            ${anime.genres ? `
                                <div class="anime-genres">
                                    ${anime.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                                </div>
                            ` : ''}
                            <div class="anime-actions">
                                <button class="action-btn">ADD TO LIST</button>
                                <button class="action-btn trailer">TRAILER</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="message-bubble ${message.type}">
                <div class="message-header">
                    <span>${message.type === 'user' ? 'YOU' : 'AI'}</span>
                    <span>${timestamp}</span>
                </div>
                <div class="message-content">
                    <p class="message-text">${message.content}</p>
                    ${recommendationsHTML}
                </div>
            </div>
        `;
    }

    showLoadingMessage() {
        this.isLoading = true;
        this.updateSendButton();
        
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading-message';
        loadingElement.id = 'loadingMessage';
        loadingElement.innerHTML = `
            <div class="loading-bubble">
                <div class="loading-content">
                    <div class="loading-indicator"></div>
                    <span class="loading-text">AI THINKING...</span>
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(loadingElement);
        this.scrollToBottom();
    }

    hideLoadingMessage() {
        const loadingElement = document.getElementById('loadingMessage');
        if (loadingElement) {
            loadingElement.remove();
        }
        this.isLoading = false;
        this.updateSendButton();
    }

    updateSendButton() {
        if (this.isLoading) {
            this.sendBtn.innerHTML = `
                <div class="loading-indicator"></div>
                <span>PROCESSING...</span>
            `;
            this.sendBtn.disabled = true;
        } else {
            this.sendBtn.innerHTML = `
                <span class="send-text">SEND</span>
                <span class="send-arrow">→</span>
            `;
            this.sendBtn.disabled = false;
        }
    }

    simulateAIResponse(userMessage) {
        // Simulate thinking time
        setTimeout(() => {
            this.hideLoadingMessage();
            
            // Generate mock recommendations based on user message
            const recommendations = this.generateMockRecommendations(userMessage);
            
            this.addMessage('ai', 'Here are some anime recommendations based on your request:', recommendations);
        }, 2000 + Math.random() * 1000); // 2-3 seconds
    }

    generateMockRecommendations(userMessage) {
        const mockAnime = [
            {
                title: "Your Name",
                description: "A beautiful story about two teenagers who share a profound, magical connection.",
                year: 2016,
                genres: ["Romance", "Drama", "Supernatural"]
            },
            {
                title: "Spirited Away",
                description: "A young girl enters a world ruled by gods and witches.",
                year: 2001,
                genres: ["Adventure", "Family", "Fantasy"]
            },
            {
                title: "Attack on Titan",
                description: "Humanity fights for survival against giant humanoid creatures.",
                year: 2013,
                genres: ["Action", "Drama", "Horror"]
            },
            {
                title: "Death Note",
                description: "A high school student discovers a supernatural notebook.",
                year: 2006,
                genres: ["Psychological", "Thriller", "Supernatural"]
            },
            {
                title: "My Hero Academia",
                description: "In a world where most people have superpowers, a boy without them dreams of becoming a hero.",
                year: 2016,
                genres: ["Action", "School", "Superhero"]
            }
        ];

        // Return 2-3 random recommendations
        const shuffled = mockAnime.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
    }

    hideWelcomeState() {
        if (this.welcomeState) {
            this.welcomeState.style.display = 'none';
        }
    }

    showWelcomeState() {
        if (this.welcomeState) {
            this.welcomeState.style.display = 'flex';
        }
    }

    clearChat() {
        this.chatHistory = [];
        this.messagesContainer.innerHTML = '';
        this.showWelcomeState();
        this.updateMessageCount();
        this.messageInput.value = '';
        this.updateCharCount();
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
}

// Initialize the chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnimuseBrutalistChat();
});
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        this.addUserMessage(message);
        this.messageInput.value = '';
        this.updateCharCount();

        // Simulate AI response
        setTimeout(() => {
            this.addAIResponse(message);
        }, 1000 + Math.random() * 2000);
    }

    addUserMessage(message) {
        const timestamp = this.getCurrentTime();
        const messageBlock = this.createMessageBlock('user', message, timestamp);
        this.chatMessages.appendChild(messageBlock);
        this.scrollToBottom();
        this.addGlitchEffect(messageBlock);
    }

    addAIResponse(userMessage) {
        const timestamp = this.getCurrentTime();
        const response = this.generateAIResponse(userMessage);
        const messageBlock = this.createMessageBlock('ai', response, timestamp);
        this.chatMessages.appendChild(messageBlock);
        this.scrollToBottom();
        this.addTypewriterEffect(messageBlock);
    }

    createMessageBlock(type, content, timestamp) {
        const messageBlock = document.createElement('div');
        messageBlock.className = `message-block ${type}-message`;
        
        // Add random rotation for brutalist effect
        const rotation = (Math.random() - 0.5) * 2;
        messageBlock.style.transform = `rotate(${rotation}deg)`;
        
        messageBlock.innerHTML = `
            <div class="message-header">
                <span class="sender-tag">${type === 'user' ? 'USER//INPUT' : 'AI//SYSTEM'}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">
                <p>${content}</p>
            </div>
        `;

        return messageBlock;
    }

    generateAIResponse(userMessage) {
        const responses = [
            "ANALYZING REQUEST... Based on your preferences, I've identified several high-probability matches in our recommendation matrix.",
            "PATTERN RECOGNITION COMPLETE. Your input suggests interest in experimental/alternative content. Processing recommendations...",
            "NEURAL NETWORK ACTIVATED. Cross-referencing your query with 847,293 data points. Results incoming.",
            "RECOMMENDATION ALGORITHM ENGAGED. Matching your criteria against behavioral patterns and preference clusters.",
            "DATA SYNTHESIS IN PROGRESS. Your request has been parsed and weighted against our recommendation database."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getCurrentTime() {
        const now = new Date();
        return now.toTimeString().slice(0, 8);
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        const maxLength = this.messageInput.getAttribute('maxlength');
        this.charCount.textContent = `${count}/${maxLength}`;
        
        // Change color based on character count
        if (count > maxLength * 0.8) {
            this.charCount.style.color = '#ff0000';
        } else if (count > maxLength * 0.6) {
            this.charCount.style.color = '#ffff00';
        } else {
            this.charCount.style.color = '#f0f0f0';
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    switchSession(sessionItem) {
        // Remove active class from all sessions
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked session
        sessionItem.classList.add('active');
        
        // Add brutal feedback effect
        sessionItem.style.transform = 'translate(-4px, -4px) scale(0.98)';
        setTimeout(() => {
            sessionItem.style.transform = '';
        }, 150);
    }

    handleRecommendationAction(e) {
        const button = e.target;
        const card = button.closest('.rec-card');
        
        // Add brutal click effect
        button.style.transform = 'scale(0.95)';
        button.style.background = '#ff0000';
        button.textContent = 'LOADING...';
        
        setTimeout(() => {
            button.style.transform = '';
            button.style.background = '';
            button.textContent = button.textContent.replace('LOADING...', 'DONE!');
        }, 1000);

        // Add card shake effect
        this.addShakeEffect(card);
    }

    handleActionClick(e) {
        const button = e.target;
        const originalText = button.textContent;
        
        // Brutal button feedback
        button.style.transform = 'translate(-4px, -4px) scale(0.95)';
        button.textContent = 'PROCESSING...';
        
        setTimeout(() => {
            button.style.transform = '';
            button.textContent = originalText;
        }, 1500);
    }

    addBrutalHoverEffects() {
        // Add random glitch effects on hover
        document.querySelectorAll('.rec-card, .session-item').forEach(element => {
            element.addEventListener('mouseenter', () => {
                if (Math.random() > 0.7) {
                    this.addGlitchEffect(element);
                }
            });
        });
    }

    addGlitchEffect(element) {
        element.style.filter = 'hue-rotate(180deg) contrast(200%)';
        element.style.transform += ' skew(2deg, 0deg)';
        
        setTimeout(() => {
            element.style.filter = '';
            element.style.transform = element.style.transform.replace(' skew(2deg, 0deg)', '');
        }, 200);
    }

    addShakeEffect(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }

    addTypewriterEffect(messageBlock) {
        const textElement = messageBlock.querySelector('.message-content p');
        const text = textElement.textContent;
        textElement.textContent = '';
        
        let i = 0;
        const typeInterval = setInterval(() => {
            textElement.textContent += text[i];
            i++;
            
            if (i >= text.length) {
                clearInterval(typeInterval);
            }
        }, 30);
    }

    addTypingEffects() {
        // Add typing indicator when AI is "thinking"
        this.messageInput.addEventListener('keydown', () => {
            if (Math.random() > 0.95) {
                this.showTypingIndicator();
            }
        });
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-block ai-message">
                <div class="message-header">
                    <span class="sender-tag">AI//THINKING</span>
                    <span class="timestamp">${this.getCurrentTime()}</span>
                </div>
                <div class="message-content">
                    <div class="loading-bar"></div>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(indicator);
        this.scrollToBottom();
        
        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }

    initializeAnimations() {
        // Add staggered animation to existing elements
        const elements = document.querySelectorAll('.message-block, .rec-card, .session-item');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px) rotate(5deg)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.5s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0) rotate(0deg)';
            }, index * 100);
        });

        // Add random glitch animations
        setInterval(() => {
            if (Math.random() > 0.8) {
                const elements = document.querySelectorAll('.message-block');
                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                if (randomElement) {
                    this.addGlitchEffect(randomElement);
                }
            }
        }, 5000);
    }

    // System status updates
    updateSystemStatus() {
        const statusText = document.querySelector('.status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        
        const statuses = ['ONLINE', 'PROCESSING', 'ANALYZING', 'LEARNING'];
        const colors = ['#00ff00', '#ffff00', '#ff0000', '#0000ff'];
        
        setInterval(() => {
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            statusText.textContent = randomStatus;
            statusIndicator.style.background = randomColor;
        }, 10000);
    }
}

// CSS for additional animations
const additionalStyles = `
    .shake {
        animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px) rotate(-1deg); }
        75% { transform: translateX(5px) rotate(1deg); }
    }
    
    .typing-indicator {
        opacity: 0;
        animation: fadeIn 0.3s ease-in-out forwards;
    }
    
    @keyframes fadeIn {
        to { opacity: 1; }
    }
    
    .glitch {
        animation: glitch 0.3s ease-in-out;
    }
    
    @keyframes glitch {
        0% { transform: translate(0); }
        20% { transform: translate(-2px, 2px); }
        40% { transform: translate(-2px, -2px); }
        60% { transform: translate(2px, 2px); }
        80% { transform: translate(2px, -2px); }
        100% { transform: translate(0); }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize the chat interface
document.addEventListener('DOMContentLoaded', () => {
    const brutalistChat = new BrutalistChat();
    
    // Add some easter eggs
    document.addEventListener('keydown', (e) => {
        // Konami code for special effects
        if (e.ctrlKey && e.shiftKey && e.key === 'B') {
            document.body.style.filter = 'invert(1) hue-rotate(180deg)';
            setTimeout(() => {
                document.body.style.filter = '';
            }, 2000);
        }
    });
    
    // Random system messages
    setInterval(() => {
        if (Math.random() > 0.95) {
            const systemMessages = [
                "SYSTEM: Memory optimized",
                "SYSTEM: Learning patterns updated",
                "SYSTEM: Recommendation matrix refreshed",
                "SYSTEM: Neural pathways strengthened"
            ];
            
            console.log(systemMessages[Math.floor(Math.random() * systemMessages.length)]);
        }
    }, 30000);
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrutalistChat;
}