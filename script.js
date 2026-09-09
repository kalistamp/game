// Game State
let gameState = {
    mode: 'buyer', // 'buyer' or 'cashier'
    difficulty: 'medium', // 'easy', 'medium', 'hard'
    score: 0,
    streak: 0,
    targetAmount: 0.00,
    customerPayment: 0.00, // For cashier mode
    items: [],
    selectedCurrency: {
        20: 0,
        10: 0,
        5: 0,
        1: 0,
        0.25: 0,
        0.10: 0,
        0.05: 0,
        0.01: 0
    },
    isMuted: false
};

// Item Pool for Shopping / Cashier Scenarios
const storeItems = [
    { name: 'Apple', emoji: '🍎', basePrice: 0.75 },
    { name: 'Toy Car', emoji: '🚗', basePrice: 4.50 },
    { name: 'Comic Book', emoji: '📖', basePrice: 3.25 },
    { name: 'Soccer Ball', emoji: '⚽', basePrice: 12.00 },
    { name: 'Ice Cream', emoji: '🍦', basePrice: 2.50 },
    { name: 'Teddy Bear', emoji: '🧸', basePrice: 8.99 },
    { name: 'Crayon Box', emoji: '🖍️', basePrice: 1.99 },
    { name: 'Board Game', emoji: '🎲', basePrice: 14.50 },
    { name: 'Water Bottle', emoji: '🍼', basePrice: 3.75 },
    { name: 'Puzzle', emoji: '🧩', basePrice: 6.25 },
    { name: 'Notebook', emoji: '📓', basePrice: 2.20 },
    { name: 'Action Figure', emoji: '🦸', basePrice: 9.50 }
];

// Web Audio API Sound Synthesizer
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (gameState.isMuted) return;
    try {
        initAudio();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'coin') {
            // High pitch metallic ping
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now); // B5
            osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1); // E6
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'bill') {
            // Crisp paper rustle (filtered noise / soft triangle tone)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'success') {
            // Triumphant chime
            osc.type = 'sine';
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, index) => {
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                noteOsc.frequency.setValueAtTime(freq, now + index * 0.08);
                noteGain.gain.setValueAtTime(0.15, now + index * 0.08);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);
                noteOsc.start(now + index * 0.08);
                noteOsc.stop(now + index * 0.08 + 0.3);
            });
        } else if (type === 'error') {
            // Low buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.setValueAtTime(110, now + 0.1);
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'register') {
            // Cash register 'Cha-ching'
            playSound('success');
        }
    } catch (e) {
        console.error("Audio playback error:", e);
    }
}

// DOM Elements
const scoreValEl = document.getElementById('score-val');
const streakValEl = document.getElementById('streak-val');
const difficultySelect = document.getElementById('difficulty-select');
const modeTabs = document.querySelectorAll('.mode-tab');
const scenarioTitle = document.getElementById('scenario-title');
const problemLevelBadge = document.getElementById('problem-level-badge');
const scenarioContent = document.getElementById('scenario-content');
const targetLabel = document.getElementById('target-label');
const targetAmountEl = document.getElementById('target-amount');
const selectedTotalEl = document.getElementById('selected-total');
const clearBtn = document.getElementById('clear-btn');
const submitBtn = document.getElementById('submit-btn');
const muteBtn = document.getElementById('mute-btn');
const helpBtn = document.getElementById('help-btn');

const feedbackModal = document.getElementById('feedback-modal');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackMessage = document.getElementById('feedback-message');
const feedbackBonus = document.getElementById('feedback-bonus');
const nextBtn = document.getElementById('next-btn');

const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help-btn');

// Initialize Game
function initGame() {
    setupEventListeners();
    generateNewProblem();
}

function setupEventListeners() {
    // Mode tabs
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            gameState.mode = tab.dataset.mode;
            clearSelection();
            generateNewProblem();
        });
    });

    // Difficulty change
    difficultySelect.addEventListener('change', (e) => {
        gameState.difficulty = e.target.value;
        clearSelection();
        generateNewProblem();
    });

    // Currency buttons click
    document.querySelectorAll('.curr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const val = parseFloat(btn.dataset.value);
            
            // Increment count
            gameState.selectedCurrency[val] = (gameState.selectedCurrency[val] || 0) + 1;
            
            // Play sound
            if (type === 'bill') {
                playSound('bill');
            } else {
                playSound('coin');
            }

            updateUI();
        });
    });

    // Clear selection
    clearBtn.addEventListener('click', () => {
        clearSelection();
        updateUI();
    });

    // Submit answer
    submitBtn.addEventListener('click', checkAnswer);

    // Next problem
    nextBtn.addEventListener('click', () => {
        feedbackModal.classList.add('hidden');
        clearSelection();
        generateNewProblem();
    });

    // Mute toggle
    muteBtn.addEventListener('click', () => {
        gameState.isMuted = !gameState.isMuted;
        muteBtn.textContent = gameState.isMuted ? '🔇' : '🔊';
    });

    // Help modal
    helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
    closeHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));

    // Allow right click or long press or double click on currency buttons to decrement if desired,
    // or clicking count badge to reset/decrement. Let's add click on count badge or double click to decrease.
    document.querySelectorAll('.curr-btn').forEach(btn => {
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const val = parseFloat(btn.dataset.value);
            if (gameState.selectedCurrency[val] > 0) {
                gameState.selectedCurrency[val]--;
                playSound(btn.dataset.type === 'bill' ? 'bill' : 'coin');
                updateUI();
            }
        });
    });
}

function clearSelection() {
    Object.keys(gameState.selectedCurrency).forEach(key => {
        gameState.selectedCurrency[key] = 0;
    });
}

// Problem Generator
function generateNewProblem() {
    const diff = gameState.difficulty;
    
    // Pick 1 to 3 items
    let itemCount = diff === 'easy' ? 1 : (diff === 'medium' ? 2 : 3);
    let selectedItems = [];
    
    let shuffled = [...storeItems].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < itemCount; i++) {
        let item = shuffled[i];
        // Adjust price based on difficulty if needed
        let price = item.basePrice;
        if (diff === 'easy') {
            // Round to whole dollar or .50
            price = Math.ceil(price);
            if (Math.random() > 0.5) price += 0.50;
        } else if (diff === 'hard') {
            // Add random cents
            price = parseFloat((price + (Math.random() * 0.90 - 0.45)).toFixed(2));
            if (price < 0.25) price = 0.50;
        }
        selectedItems.push({ ...item, price });
    }

    gameState.items = selectedItems;
    
    let total = selectedItems.reduce((sum, item) => sum + item.price, 0);
    gameState.targetAmount = parseFloat(total.toFixed(2));

    if (gameState.mode === 'buyer') {
        scenarioTitle.textContent = "Shopping Cart Total";
        targetLabel.textContent = "Amount Due:";
        targetAmountEl.textContent = `$${gameState.targetAmount.toFixed(2)}`;
    } else {
        // Cashier mode: Customer gives payment
        // Payment must be >= total
        let standardBills = [1, 5, 10, 20, 50];
        let minBill = standardBills.find(b => b >= gameState.targetAmount) || 20;
        if (gameState.targetAmount > minBill) minBill = 50;
        
        // Pick payment amount that is clean or slightly higher
        let paymentOptions = [minBill];
        if (minBill < 20) paymentOptions.push(20);
        if (minBill < 10) paymentOptions.push(10);
        
        // Add some random cash handed by customer (e.g. exact or round bills)
        let payment = minBill;
        if (gameState.targetAmount === minBill) {
            payment = minBill + (Math.random() > 0.5 ? 5 : 10);
        } else if (Math.random() > 0.5 && minBill <= 10) {
            payment = minBill + 5;
        }
        
        gameState.customerPayment = parseFloat(payment.toFixed(2));
        // Change to return is customerPayment - targetAmount
        let changeDue = gameState.customerPayment - gameState.targetAmount;
        gameState.targetAmount = parseFloat(changeDue.toFixed(2));

        scenarioTitle.textContent = "Customer Transaction";
        targetLabel.textContent = "Change Due:";
        targetAmountEl.textContent = `$${gameState.targetAmount.toFixed(2)}`;
    }

    problemLevelBadge.textContent = `Level: ${diff.toUpperCase()}`;
    renderScenarioContent();
    updateUI();
}

function renderScenarioContent() {
    scenarioContent.innerHTML = '';
    
    if (gameState.mode === 'buyer') {
        gameState.items.forEach(item => {
            const badge = document.createElement('div');
            badge.className = 'item-badge';
            badge.innerHTML = `<span class="emoji">${item.emoji}</span> <span>${item.name}</span> <b>$${item.price.toFixed(2)}</b>`;
            scenarioContent.appendChild(badge);
        });
    } else {
        // Cashier mode display
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cashier-info';
        
        let itemsHtml = gameState.items.map(i => `${i.emoji} ${i.name} ($${i.price.toFixed(2)})`).join(', ');
        infoDiv.innerHTML = `
            <div>🛍️ <b>Items Bought:</b> ${itemsHtml}</div>
            <div>💰 <b>Total Cost:</b> $${gameState.items.reduce((s,i)=>s+i.price,0).toFixed(2)}</div>
            <div>💵 <b>Customer Handed:</b> <span style="color:var(--secondary); font-size:20px;">$${gameState.customerPayment.toFixed(2)}</span></div>
        `;
        scenarioContent.appendChild(infoDiv);
    }
}

function calculateSelectedTotal() {
    let total = 0;
    Object.keys(gameState.selectedCurrency).forEach(valStr => {
        let val = parseFloat(valStr);
        let count = gameState.selectedCurrency[valStr];
        total += val * count;
    });
    return parseFloat(total.toFixed(2));
}

function countTotalPieces() {
    let count = 0;
    Object.values(gameState.selectedCurrency).forEach(c => count += c);
    return count;
}

// Calculate minimum bills and coins using greedy approach (for efficiency bonus)
function getMinimumPieces(amount) {
    let remaining = Math.round(amount * 100);
    const denominations = [2000, 1000, 500, 100, 25, 10, 5, 1];
    let minPieces = 0;
    
    denominations.forEach(d => {
        let count = Math.floor(remaining / d);
        minPieces += count;
        remaining %= d;
    });
    
    return minPieces;
}

function updateUI() {
    // Update counts on buttons
    Object.keys(gameState.selectedCurrency).forEach(val => {
        const countEl = document.getElementById(`count-bill-${val}`) || document.getElementById(`count-coin-${val}`);
        if (countEl) {
            let count = gameState.selectedCurrency[val];
            countEl.textContent = count;
            countEl.style.display = count > 0 ? 'flex' : 'none';
        }
    });

    // Update selected total
    const selectedTotal = calculateSelectedTotal();
    selectedTotalEl.textContent = `$${selectedTotal.toFixed(2)}`;

    // Update stats
    scoreValEl.textContent = gameState.score;
    streakValEl.textContent = `🔥 ${gameState.streak}`;
}

function checkAnswer() {
    const selectedTotal = calculateSelectedTotal();
    const target = gameState.targetAmount;

    // Check equality with small epsilon for floating point math
    const diff = Math.abs(selectedTotal - target);
    const isCorrect = diff < 0.001;

    if (isCorrect) {
        playSound('success');
        
        // Calculate points & efficiency bonus
        let basePoints = 100;
        if (gameState.difficulty === 'medium') basePoints = 150;
        if (gameState.difficulty === 'hard') basePoints = 200;

        let userPieces = countTotalPieces();
        let minPieces = getMinimumPieces(target);
        
        let hasBonus = userPieces <= minPieces && userPieces > 0;
        let bonusPoints = hasBonus ? 50 : 0;

        gameState.score += basePoints + bonusPoints;
        gameState.streak++;

        // Show feedback modal
        feedbackIcon.textContent = hasBonus ? '🌟' : '🎉';
        feedbackTitle.textContent = hasBonus ? 'Super Efficient! 🌟' : 'Correct! 🎉';
        feedbackMessage.textContent = gameState.mode === 'buyer' 
            ? `You paid $${target.toFixed(2)} exact!` 
            : `You gave the correct change of $${target.toFixed(2)}!`;

        if (hasBonus) {
            feedbackBonus.classList.remove('hidden');
            feedbackBonus.textContent = `🌟 Efficiency Bonus (+${bonusPoints} pts)! Used fewest bills & coins!`;
        } else {
            feedbackBonus.classList.add('hidden');
        }

        feedbackModal.classList.remove('hidden');
    } else {
        playSound('error');
        gameState.streak = 0;
        
        feedbackIcon.textContent = '❌';
        feedbackTitle.textContent = 'Not Quite Right';
        if (selectedTotal < target) {
            feedbackMessage.textContent = `You selected $${selectedTotal.toFixed(2)}, which is too little. You need $${(target - selectedTotal).toFixed(2)} more!`;
        } else {
            feedbackMessage.textContent = `You selected $${selectedTotal.toFixed(2)}, which is too much by $${(selectedTotal - target).toFixed(2)}.`;
        }
        feedbackBonus.classList.add('hidden');
        feedbackModal.classList.remove('hidden');
    }

    updateUI();
}

// Start on load
window.addEventListener('DOMContentLoaded', initGame);
