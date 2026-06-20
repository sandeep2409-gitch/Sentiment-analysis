/* ==========================================================================
   AURA Client-Side Application Controller (Day 28 Sentiment & Emotion)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Cache
    const textInput = document.getElementById('text-input');
    const charCounter = document.getElementById('char-counter');
    const wordCounter = document.getElementById('word-counter');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const presetBtns = document.querySelectorAll('.preset-btn');
    
    // Status DOM
    const modelStatusText = document.getElementById('model-status-text');
    const modelStatusDot = document.querySelector('.status-dot');
    const deviceText = document.getElementById('device-text');
    
    // Panel/Layout DOM
    const placeholderPanel = document.getElementById('dashboard-placeholder');
    const loadingPanel = document.getElementById('dashboard-loading');
    const contentPanel = document.getElementById('dashboard-content');
    const analysisStepText = document.getElementById('analysis-step-text');
    
    // Analytics Metrics DOM
    const dominantEmoji = document.getElementById('dominant-emoji');
    const dominantTitle = document.getElementById('dominant-title');
    const dominantPercentage = document.getElementById('dominant-percentage');
    const dominantFill = document.getElementById('dominant-fill');
    const dominantCard = document.getElementById('dominant-emotion-card');
    
    const statsWords = document.getElementById('stats-words');
    const statsSentences = document.getElementById('stats-sentences');
    
    // Sentiment DOM
    const fillNeg = document.getElementById('sentiment-fill-neg');
    const fillNeu = document.getElementById('sentiment-fill-neu');
    const fillPos = document.getElementById('sentiment-fill-pos');
    const valNeg = document.getElementById('sentiment-val-neg');
    const valNeu = document.getElementById('sentiment-val-neu');
    const valPos = document.getElementById('sentiment-val-pos');
    const sentimentVerdict = document.getElementById('sentiment-verdict-text');
    
    // Sentence Breakdown DOM
    const sentencesWrapper = document.getElementById('sentences-wrapper');
    const inspectorPlaceholder = document.getElementById('inspector-placeholder');
    const inspectorDetail = document.getElementById('inspector-detail');
    const inspectorText = document.getElementById('inspector-sentence-text');
    const inspectorDominant = document.getElementById('inspector-sentence-dominant');
    const inspectorMiniChart = document.getElementById('inspector-mini-chart');
    
    // Action Buttons
    const exportBtn = document.getElementById('export-btn');
    const emojiContainer = document.getElementById('emoji-rain-container');

    // State Variables
    let modelReady = false;
    let isAnalyzing = false;
    let pollingInterval = null;
    let lastAnalysisData = null;

    // Emotion Color Registry (matching styles.css variables)
    const emotionRegistry = {
        joy: { emoji: '😊', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.35)', particles: ['😊', '🎉', '✨', '☀️', '💖'] },
        sadness: { emoji: '😢', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.35)', particles: ['😢', '🌧️', '💧', '😭', '💔'] },
        anger: { emoji: '😠', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.35)', particles: ['😠', '🔥', '💢', '💥', '⚡'] },
        fear: { emoji: '😨', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.35)', particles: ['😨', '👻', '😱', '🕸️', '🔮'] },
        surprise: { emoji: '😲', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.35)', particles: ['😲', '💥', '‼️', '✨', '🎁'] },
        disgust: { emoji: '🤢', color: '#10b981', glow: 'rgba(16, 185, 129, 0.35)', particles: ['🤢', '🤮', '🍃', '⚠️', '☣️'] },
        neutral: { emoji: '😐', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.35)', particles: ['😐', '💬', '⚪', '💭', '⚖️'] }
    };

    // Preset Passages Dictionary
    const presetPassages = {
        joy: "I am so incredibly happy and excited! Today was the most beautiful day. I received the best news ever and I can't stop smiling! Everything is perfect.",
        anger: "This is absolutely unacceptable! I have been waiting for over an hour and your customer service is complete garbage. Fix this right now or I demand a full refund immediately!",
        sadness: "It feels so cold and quiet today. I miss them more than words can describe, and the empty space in my heart just won't go away. I just want to sit in silence.",
        fear: "The floorboards creaked softly behind me in the pitch dark. My heart started pounding and I held my breath, terrified of what was lurking in the shadows just inches away.",
        surprise: "Oh my goodness, I can't believe it! I was completely shocked when I walked in and everyone jumped out screaming happy birthday! I had absolutely no idea!",
        disgust: "The smell coming from the refrigerator was utterly repulsive. I looked inside and saw a container covered in fuzzy green mold, causing my stomach to turn in pure aversion."
    };

    /* ==========================================================================
       1. Model Status Poller
       ========================================================================== */
    const checkModelStatus = async () => {
        try {
            const response = await fetch('/status');
            const data = await response.json();
            
            deviceText.textContent = data.device.toUpperCase();
            
            if (data.status === 'ready') {
                modelReady = true;
                modelStatusText.textContent = 'MODEL READY';
                modelStatusDot.className = 'status-dot ready pulsing';
                
                // Enable inputs if not actively analyzing
                if (!isAnalyzing) {
                    textInput.removeAttribute('disabled');
                    validateInput();
                }
                
                // Stop status polling once ready
                clearInterval(pollingInterval);
                pollingInterval = null;
            } else if (data.status === 'loading') {
                modelReady = false;
                modelStatusText.textContent = 'DOWNLOADING MODEL...';
                modelStatusDot.className = 'status-dot loading pulsing';
                textInput.setAttribute('disabled', 'true');
                analyzeBtn.setAttribute('disabled', 'true');
            } else if (data.status === 'error') {
                modelReady = false;
                modelStatusText.textContent = 'ERROR LOADING MODEL';
                modelStatusDot.className = 'status-dot error';
                console.error('Hugging Face Model error:', data.error);
                textInput.setAttribute('disabled', 'true');
                analyzeBtn.setAttribute('disabled', 'true');
                
                // Show friendly status notice in console
                alert(`Error loading NLP model: ${data.error}. Make sure you have internet access on first boot.`);
                clearInterval(pollingInterval);
            }
        } catch (e) {
            console.error('Failed to connect to status endpoint:', e);
            modelStatusText.textContent = 'CONNECTION ERROR';
            modelStatusDot.className = 'status-dot error';
        }
    };

    // Start status polling
    pollingInterval = setInterval(checkModelStatus, 2000);
    checkModelStatus(); // Initial run

    /* ==========================================================================
       2. Input Validation & Counters
       ========================================================================= */
    const countWords = (str) => {
        if (!str || str.trim() === '') return 0;
        return str.trim().split(/\s+/).length;
    };

    const validateInput = () => {
        const text = textInput.value;
        const chars = text.length;
        const words = countWords(text);
        
        charCounter.textContent = `${chars} / 5000 chars`;
        wordCounter.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        
        if (modelReady && words >= 2 && !isAnalyzing) {
            analyzeBtn.removeAttribute('disabled');
        } else {
            analyzeBtn.setAttribute('disabled', 'true');
        }
    };

    textInput.addEventListener('input', validateInput);

    /* ==========================================================================
       3. Presets Event Listeners
       ========================================================================= */
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!modelReady || isAnalyzing) return;
            
            const emotion = btn.dataset.preset;
            if (presetPassages[emotion]) {
                textInput.value = presetPassages[emotion];
                validateInput();
                triggerAnalysis();
            }
        });
    });

    /* ==========================================================================
       4. Clear & Action Controls
       ========================================================================= */
    clearBtn.addEventListener('click', () => {
        textInput.value = '';
        validateInput();
        placeholderPanel.classList.remove('hidden');
        contentPanel.classList.add('hidden');
        loadingPanel.classList.add('hidden');
        textInput.focus();
    });

    /* ==========================================================================
       5. Analysis Controller
       ========================================================================= */
    const triggerAnalysis = async () => {
        const text = textInput.value.trim();
        if (!text || countWords(text) < 2) return;

        isAnalyzing = true;
        analyzeBtn.setAttribute('disabled', 'true');
        analyzeBtn.classList.add('loading');
        textInput.setAttribute('disabled', 'true');
        
        placeholderPanel.classList.add('hidden');
        contentPanel.classList.add('hidden');
        loadingPanel.classList.remove('hidden');
        
        analysisStepText.textContent = "Analyzing overall emotional aura...";

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server returned an error');
            }

            const result = await response.json();
            
            // Artificial delay to make transitions feel intentional and premium
            await new Promise(resolve => setTimeout(resolve, 800));
            
            lastAnalysisData = result;
            renderDashboard(result);
            triggerEmojiRain(result.overall.dominant);
            
        } catch (err) {
            console.error('Analysis failed:', err);
            alert(`Analysis failed: ${err.message}`);
            placeholderPanel.classList.remove('hidden');
        } finally {
            isAnalyzing = false;
            analyzeBtn.classList.remove('loading');
            textInput.removeAttribute('disabled');
            validateInput();
            loadingPanel.classList.add('hidden');
        }
    };

    analyzeBtn.addEventListener('click', triggerAnalysis);

    /* ==========================================================================
       6. Render Dashboard Results
       ========================================================================= */
    const renderDashboard = (data) => {
        // Show main panel
        contentPanel.classList.remove('hidden');
        
        const overall = data.overall;
        const domEmotion = overall.dominant;
        const domMeta = emotionRegistry[domEmotion] || emotionRegistry.neutral;
        const domScore = overall.scores[domEmotion];
        const domPct = Math.round(domScore * 100);

        // 6.1 Update Theme Variables Dynamically
        document.documentElement.style.setProperty('--emotion-primary', domMeta.color);
        document.documentElement.style.setProperty('--emotion-glow', domMeta.glow);

        // 6.2 Render Dominant Emotion Card
        dominantEmoji.textContent = domMeta.emoji;
        dominantTitle.textContent = domEmotion;
        dominantPercentage.textContent = `${domPct}%`;
        dominantFill.style.width = `${domPct}%`;

        statsWords.textContent = data.word_count;
        statsSentences.textContent = data.total_sentences;

        // 6.3 Deriving Sentiment Spectrum (Positive / Neutral / Negative)
        // Formula mapping the 7 emotions into 3 sentiment coordinates
        const joy = overall.scores['joy'] || 0;
        const surprise = overall.scores['surprise'] || 0;
        const sadness = overall.scores['sadness'] || 0;
        const anger = overall.scores['anger'] || 0;
        const fear = overall.scores['fear'] || 0;
        const disgust = overall.scores['disgust'] || 0;
        const neutral = overall.scores['neutral'] || 0;

        // Positive leans heavily on joy, somewhat on surprise
        const posVal = joy + (surprise * 0.3);
        // Negative aggregates fear, sadness, disgust, anger
        const negVal = anger + sadness + fear + disgust;
        // Neutral combines neutral state and the remainder of surprise
        const neuVal = neutral + (surprise * 0.7);

        const totalSentiment = posVal + negVal + neuVal;
        
        const posPct = Math.round((posVal / totalSentiment) * 100);
        const negPct = Math.round((negVal / totalSentiment) * 100);
        const neuPct = 100 - posPct - negPct; // Safeguard sum to exactly 100%

        fillPos.style.width = `${posPct}%`;
        fillNeu.style.width = `${neuPct}%`;
        fillNeg.style.width = `${negPct}%`;

        valPos.textContent = `${posPct}%`;
        valNeu.textContent = `${neuPct}%`;
        valNeg.textContent = `${negPct}%`;

        // Verdict Text Generator
        if (posPct > negPct && posPct > neuPct) {
            sentimentVerdict.innerHTML = `<i class="fa-solid fa-face-smile" style="color: var(--color-joy)"></i> The overall text carries a <strong>positive</strong> sentiment tone.`;
        } else if (negPct > posPct && negPct > neuPct) {
            sentimentVerdict.innerHTML = `<i class="fa-solid fa-face-frown" style="color: var(--color-anger)"></i> The overall text carries a <strong>negative</strong> sentiment tone.`;
        } else {
            sentimentVerdict.innerHTML = `<i class="fa-solid fa-face-meh" style="color: var(--text-muted)"></i> The overall text carries a <strong>neutral</strong> or balanced sentiment tone.`;
        }

        // 6.4 Render Overall Emotion Bar Chart
        const emotionsOrdered = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'];
        emotionsOrdered.forEach(emotion => {
            const row = document.querySelector(`.chart-bar-row[data-emotion="${emotion}"]`);
            if (row) {
                const fill = row.querySelector('.chart-bar-fill');
                const valEl = row.querySelector('.chart-bar-value');
                const score = overall.scores[emotion] || 0;
                const pct = Math.round(score * 100);
                
                fill.style.width = `${pct}%`;
                valEl.textContent = `${pct}%`;
            }
        });

        // 6.5 Render Sentence-by-Sentence Breakdown
        sentencesWrapper.innerHTML = '';
        data.sentences.forEach((sentence, idx) => {
            const span = document.createElement('span');
            span.className = 'analysis-sentence';
            span.textContent = sentence.text;
            span.dataset.dominant = sentence.dominant;
            span.dataset.idx = idx;
            
            // Set individual hover variables
            const sentenceMeta = emotionRegistry[sentence.dominant] || emotionRegistry.neutral;
            span.style.setProperty('--sentence-color', sentenceMeta.color);
            span.style.setProperty('--sentence-bg', sentenceMeta.glow);

            span.addEventListener('click', () => {
                selectSentence(idx);
            });

            sentencesWrapper.appendChild(span);
        });

        // Auto-select the first sentence to populate inspector
        if (data.sentences.length > 0) {
            selectSentence(0);
        } else {
            inspectorPlaceholder.classList.remove('hidden');
            inspectorDetail.classList.add('hidden');
        }
    };

    /* ==========================================================================
       7. Sentence Inspector Selector
       ========================================================================= */
    const selectSentence = (idx) => {
        if (!lastAnalysisData || !lastAnalysisData.sentences[idx]) return;
        
        // Remove active class from all sentences
        const sentenceSpans = sentencesWrapper.querySelectorAll('.analysis-sentence');
        sentenceSpans.forEach(span => {
            span.classList.remove('active-sentence');
        });

        // Add active class to selected sentence
        const activeSpan = sentenceSpans[idx];
        if (activeSpan) {
            activeSpan.classList.add('active-sentence');
            // Scroll sentence into view inside the container if needed
            activeSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        const sentence = lastAnalysisData.sentences[idx];
        const meta = emotionRegistry[sentence.dominant] || emotionRegistry.neutral;

        // Update inspector DOM
        inspectorPlaceholder.classList.add('hidden');
        inspectorDetail.classList.remove('hidden');
        
        inspectorText.textContent = `"${sentence.text}"`;
        inspectorDominant.textContent = sentence.dominant;
        inspectorDominant.style.backgroundColor = meta.color;
        
        // Render Mini Bars in Inspector
        inspectorMiniChart.innerHTML = '';
        
        // Filter out very low scoring emotions for the mini inspector chart to keep it clean
        const emotionsSorted = Object.entries(sentence.scores)
            .sort((a, b) => b[1] - a[1]); // Sort descending

        emotionsSorted.forEach(([emotion, score]) => {
            const pct = Math.round(score * 100);
            const emotionMeta = emotionRegistry[emotion] || emotionRegistry.neutral;
            
            const miniRow = document.createElement('div');
            miniRow.className = 'chart-bar-row';
            miniRow.style.gridTemplateColumns = '90px 1fr 35px';
            miniRow.style.gap = '0.5rem';
            miniRow.style.marginBottom = '0.35rem';
            
            miniRow.innerHTML = `
                <span class="chart-bar-label" style="font-size: 0.75rem;">
                    <span class="emoji-indicator">${emotionMeta.emoji}</span> 
                    <span style="text-transform: capitalize;">${emotion}</span>
                </span>
                <div class="chart-bar-track" style="height: 6px;">
                    <div class="chart-bar-fill" style="width: ${pct}%; background-color: ${emotionMeta.color}; box-shadow: 0 0 4px ${emotionMeta.glow}"></div>
                </div>
                <span class="chart-bar-value" style="font-size: 0.7rem;">${pct}%</span>
            `;
            
            inspectorMiniChart.appendChild(miniRow);
        });
    };

    /* ==========================================================================
       8. Emoji Particle Rain System
       ========================================================================= */
    const triggerEmojiRain = (emotion) => {
        const meta = emotionRegistry[emotion] || emotionRegistry.neutral;
        const emojis = meta.particles;
        
        // Clear previous rain
        emojiContainer.innerHTML = '';
        
        // Spawn 40 particles
        const particleCount = 45;
        
        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('span');
            p.className = 'emoji-particle';
            p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            
            // Random horizontal start coordinate
            const leftPos = Math.random() * 100; // in %
            p.style.left = `${leftPos}%`;
            
            // Random font size (between 1rem and 2.2rem)
            const fontSize = 1 + (Math.random() * 1.2);
            p.style.fontSize = `${fontSize}rem`;
            
            // Random floating speed (between 2s and 4s)
            const floatDuration = 2 + (Math.random() * 2);
            p.style.animationDuration = `${floatDuration}s`;
            
            // Random animation delay to disperse flow
            const animDelay = Math.random() * 1.5;
            p.style.animationDelay = `${animDelay}s`;
            
            emojiContainer.appendChild(p);
            
            // Clean up node from DOM after animation completes
            setTimeout(() => {
                p.remove();
            }, (floatDuration + animDelay) * 1000);
        }
    };

    /* ==========================================================================
       9. Print / Export Function
       ========================================================================= */
    exportBtn.addEventListener('click', () => {
        window.print();
    });
});
