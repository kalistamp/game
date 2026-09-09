// Game State
let gameState = {
    mode: 'buyer', // 'buyer' or 'cashier'
    difficulty: 'medium', // 'easy', 'medium', 'hard'
    score: 0,
    streak: 0,
    targetAmount: 0.00,
    customerPayment: 0.00, // For cashier mode
    shelfItems: [],        // Available store items for Buyer mode (exactly 5 rotating)
    activeCart: [],        // Items selected by user in Buyer mode
    cashierItems: [],      // Items bought in Cashier mode
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
const storeItemsPool = [
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
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now);
            osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1);
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'bill') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'success') {
            osc.type = 'sine';
            const notes = [523.25, 659.25, 783.99, 1046.50];
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
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.setValueAtTime(110, now + 0.1);
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
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
const buyerWorkspace = document.getElementById('buyer-workspace');
const cashierWorkspace = document.getElementById('cashier-workspace');
const storeShelf = document.getElementById('store-shelf');
const activeCart = document.getElementById('active-cart');
const cashierScenarioContent = document.getElementById('cashier-scenario-content');
const changeCalcInput = document.getElementById('change-calc-input');
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

    // Add buttons: +1 of that denomination
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const val = parseFloat(btn.dataset.value);
            gameState.selectedCurrency[val] = (gameState.selectedCurrency[val] || 0) + 1;
            playSound(type === 'bill' ? 'bill' : 'coin');
            updateUI();
        });
    });

    // Remove buttons: -1 of that specific denomination only
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const val = parseFloat(btn.dataset.value);
            if (gameState.selectedCurrency[val] > 0) {
                gameState.selectedCurrency[val]--;
                playSound(type === 'bill' ? 'bill' : 'coin');
                updateUI();
            }
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
}

function clearSelection() {
    Object.keys(gameState.selectedCurrency).forEach(key => {
        gameState.selectedCurrency[key] = 0;
    });
    if (changeCalcInput) changeCalcInput.value = '';
}

// Problem Generator
function generateNewProblem() {
    const diff = gameState.difficulty;
    clearSelection();

    if (gameState.mode === 'buyer') {
        // Buyer Mode: Manual Item Selection (Exactly 5 rotating items on the shelf)
        scenarioTitle.textContent = "Shopping Cart (Manual Selection)";
        targetLabel.textContent = "Amount Due:";
        buyerWorkspace.classList.remove('hidden');
        cashierWorkspace.classList.add('hidden');
        
        gameState.activeCart = [];
        
        // Shuffle and take exactly 5 rotating items
        let shuffled = [...storeItemsPool].sort(() => 0.5 - Math.random());
        gameState.shelfItems = shuffled.slice(0, 5).map(item => {
            let price = item.basePrice;
            if (diff === 'easy') {
                price = Math.ceil(price);
                if (Math.random() > 0.5) price += 0.50;
            } else if (diff === 'hard') {
                price = parseFloat((price + (Math.random() * 0.90 - 0.45)).toFixed(2));
                if (price < 0.25) price = 0.50;
            }
            return { ...item, price };
        });

        renderStoreShelf();
        renderActiveCart();
        updateBuyerTarget();

    } else {
        // Cashier Mode: Calculate Change & Pay
        scenarioTitle.textContent = "Cashier Transaction";
        targetLabel.textContent = "Target Change:";
        buyerWorkspace.classList.add('hidden');
        cashierWorkspace.classList.remove('hidden');

        let itemCount = diff === 'easy' ? 1 : (diff === 'medium' ? 2 : 3);
        let shuffled = [...storeItemsPool].sort(() => 0.5 - Math.random());
        let cashierItems = [];
        
        for (let i = 0; i < itemCount; i++) {
            let item = shuffled[i];
            let price = item.basePrice;
            if (diff === 'easy') {
                price = Math.ceil(price);
                if (Math.random() > 0.5) price += 0.50;
            } else if (diff === 'hard') {
                price = parseFloat((price + (Math.random() * 0.90 - 0.45)).toFixed(2));
                if (price < 0.25) price = 0.50;
            }
            cashierItems.push({ ...item, price });
        }

        gameState.cashierItems = cashierItems;
        let total = cashierItems.reduce((sum, item) => sum + item.price, 0);
        
        // Customer payment
        let standardBills = [1, 5, 10, 20, 50];
        let minBill = standardBills.find(b => b >= total) || 20;
        if (total > minBill) minBill = 50;
        
        let payment = minBill;
        if (total === minBill) {
            payment = minBill + (Math.random() > 0.5 ? 5 : 10);
        } else if (Math.random() > 0.5 && minBill <= 10) {
            payment = minBill + 5;
        }
        
        gameState.customerPayment = parseFloat(payment.toFixed(2));
        let changeDue = gameState.customerPayment - total;
        gameState.targetAmount = parseFloat(changeDue.toFixed(2));

        renderCashierScenario();
    }

    problemLevelBadge.textContent = `Level: ${diff.toUpperCase()}`;
    updateUI();
}

function renderStoreShelf() {
    storeShelf.innerHTML = '';
    gameState.shelfItems.forEach((item) => {
        const btn = document.createElement('button');
        btn.className = 'shelf-item-btn';
        btn.innerHTML = `
            <span class="emoji">${item.emoji}</span>
            <span class="item-name">${item.name}</span>
            <span class="item-price">$${item.price.toFixed(2)}</span>
        `;
        btn.addEventListener('click', () => {
            playSound('coin');
            gameState.activeCart.push({ ...item, cartId: Date.now() + Math.random() });
            renderActiveCart();
            updateBuyerTarget();
        });
        storeShelf.appendChild(btn);
    });
}

function renderActiveCart() {
    activeCart.innerHTML = '';
    if (gameState.activeCart.length === 0) {
        activeCart.innerHTML = '<span class="empty-cart-msg">Your cart is empty. Click items above to add them!</span>';
        return;
    }

    gameState.activeCart.forEach((item) => {
        const badge = document.createElement('div');
        badge.className = 'cart-item-badge';
        badge.innerHTML = `<span class="emoji">${item.emoji}</span> <span>${item.name}</span> <b>$${item.price.toFixed(2)}</b>`;
        badge.title = "Click to remove from cart";
        badge.addEventListener('click', () => {
            playSound('error');
            gameState.activeCart = gameState.activeCart.filter(i => i.cartId !== item.cartId);
            renderActiveCart();
            updateBuyerTarget();
        });
        activeCart.appendChild(badge);
    });
}

function updateBuyerTarget() {
    let total = gameState.activeCart.reduce((sum, item) => sum + item.price, 0);
    gameState.targetAmount = parseFloat(total.toFixed(2));
    targetAmountEl.textContent = `$${gameState.targetAmount.toFixed(2)}`;
}

function renderCashierScenario() {
    cashierScenarioContent.innerHTML = '';
    let itemsHtml = gameState.cashierItems.map(i => `${i.emoji} ${i.name} ($${i.price.toFixed(2)})`).join(', ');
    let totalCost = gameState.cashierItems.reduce((s,i)=>s+i.price,0).toFixed(2);
    
    cashierScenarioContent.innerHTML = `
        <div>🛍️ <b>Items Bought:</b> ${itemsHtml}</div>
        <div>💰 <b>Total Cost:</b> $${totalCost}</div>
        <div>💵 <b>Customer Handed:</b> <span style="color:var(--secondary); font-size:20px;">$${gameState.customerPayment.toFixed(2)}</span></div>
    `;
    targetAmountEl.textContent = `$${gameState.targetAmount.toFixed(2)}`;
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
    Object.keys(gameState.selectedCurrency).forEach(val => {
        const countEl = document.getElementById(`count-bill-${val}`) || document.getElementById(`count-coin-${val}`);
        if (countEl) {
            let count = gameState.selectedCurrency[val];
            countEl.textContent = count;
            countEl.style.display = count > 0 ? 'flex' : 'none';
        }
        // Disable remove buttons when count is 0 so kids get clear visual feedback
        document.querySelectorAll(`.remove-btn[data-value="${val}"]`).forEach(rBtn => {
            const c = gameState.selectedCurrency[val] || 0;
            rBtn.disabled = c <= 0;
            rBtn.style.opacity = c <= 0 ? '0.5' : '1';
        });
    });

    const selectedTotal = calculateSelectedTotal();
    selectedTotalEl.textContent = `$${selectedTotal.toFixed(2)}`;
    scoreValEl.textContent = gameState.score;
    streakValEl.textContent = `🔥 ${gameState.streak}`;
}

function checkAnswer() {
    const selectedTotal = calculateSelectedTotal();
    const target = gameState.targetAmount;

    if (gameState.mode === 'cashier') {
        const enteredChange = parseFloat(changeCalcInput.value);
        
        if (isNaN(enteredChange) || Math.abs(enteredChange - target) >= 0.001) {
            playSound('error');
            gameState.streak = 0;
            feedbackIcon.textContent = '❌';
            feedbackTitle.textContent = 'Change Calculation Incorrect';
            feedbackMessage.textContent = `You calculated $${isNaN(enteredChange) ? '0.00' : enteredChange.toFixed(2)}, but the correct change due is $${target.toFixed(2)} ($${gameState.customerPayment.toFixed(2)} - $${(gameState.customerPayment - target).toFixed(2)}). Please check your math!`;
            feedbackBonus.classList.add('hidden');
            feedbackModal.classList.remove('hidden');
            updateUI();
            return;
        }
    }

    if (gameState.mode === 'buyer' && gameState.activeCart.length === 0) {
        playSound('error');
        feedbackIcon.textContent = '🛒';
        feedbackTitle.textContent = 'Empty Cart';
        feedbackMessage.textContent = 'Please select at least one item from the store shelf to add to your cart before paying!';
        feedbackBonus.classList.add('hidden');
        feedbackModal.classList.remove('hidden');
        return;
    }

    const diff = Math.abs(selectedTotal - target);
    const isCorrect = diff < 0.001;

    if (isCorrect) {
        playSound('success');
        
        let basePoints = 100;
        if (gameState.difficulty === 'medium') basePoints = 150;
        if (gameState.difficulty === 'hard') basePoints = 200;

        let userPieces = countTotalPieces();
        let minPieces = getMinimumPieces(target);
        let hasBonus = userPieces <= minPieces && userPieces > 0;
        let bonusPoints = hasBonus ? 50 : 0;

        gameState.score += basePoints + bonusPoints;
        gameState.streak++;

        feedbackIcon.textContent = hasBonus ? '🌟' : '🎉';
        feedbackTitle.textContent = hasBonus ? 'Super Efficient! 🌟' : 'Correct! 🎉';
        feedbackMessage.textContent = gameState.mode === 'buyer' 
            ? `You paid $${target.toFixed(2)} exact for your items!` 
            : `Correct change calculated and paid ($${target.toFixed(2)})!`;

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

window.addEventListener('DOMContentLoaded', initGame);
