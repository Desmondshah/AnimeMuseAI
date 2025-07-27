// BRUTALIST AI RECOMMENDATIONS CHAT INTERFACE
// JavaScript functionality

class BrutalistChat {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.charCount = document.querySelector('.char-count');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateCharCount();
        this.addTypingEffects();
        this.initializeAnimations();
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

        // Session item clicks
        document.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', () => this.switchSession(item));
        });

        // Recommendation card interactions
        document.querySelectorAll('.rec-action').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRecommendationAction(e));
        });

        // Action button clicks
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleActionClick(e));
        });

        // Add brutal hover effects
        this.addBrutalHoverEffects();
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