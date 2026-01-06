// Extracted game script for The Golden Turtle - Digital Game
// Configuration
const config = {
    gameTime: 60, // seconds
    itemCounts: {
        blackBeans: 10,
        peanuts: 10,
        soyaBeans: 10,
        redBeans: 10,
        greenBeans: 10,
        pins: 4
    },
    values: {
        blackBean: 5,
        peanut: 2,
        soyaBean: 1,
        redBean: 0.5,
        greenBean: 0.1,
        pin: -5
    },
    colors: {
        pink: { name: "Pink Turtle", color: "#FF6B9D", key: "pink" },
        blue: { name: "Blue Turtle", color: "#4D96FF", key: "blue" },
        purple: { name: "Purple Turtle", color: "#9D4EDD", key: "purple" },
        orange: { name: "Orange Turtle", color: "#FF914D", key: "orange" }
    },
    controls: {
        // use lower-case keys to match keyState (which stores event.key.toLowerCase())
        player1: { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright", gust: " " },
        player2: { up: "w", down: "s", left: "a", right: "d", gust: "q" },
        player3: { up: "i", down: "k", left: "j", right: "l", gust: "u" },
        player4: { up: "8", down: "2", left: "4", right: "6", gust: "0" }
    }
};

// Game state
let gameState = {
    players: [],
    items: [],
    gameActive: false,
    timeLeft: config.gameTime,
    timerInterval: null,
    windDirection: { x: 0.5, y: 0.3 },
    windStrength: 0.5,
    selectedPlayers: 3
};

// Adjust this if the turtle head graphic faces a different default direction
const HEAD_ROTATION_OFFSET = 180; // degrees; change to 90 or 0 if needed
// DOM elements
const page1 = document.getElementById('page1');
const page2 = document.getElementById('page2');
const gameOverScreen = document.getElementById('game-over');
const startGameBtn = document.getElementById('start-game');
const playerInfoDiv = document.getElementById('player-info');
const gameBoard = document.getElementById('game-board');
const timerDisplay = document.getElementById('timer');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const winnerText = document.getElementById('winner-text');
const resultsTable = document.getElementById('results-table').getElementsByTagName('tbody')[0];
const turtleOptions = document.querySelectorAll('.turtle-option');

// Player selection
turtleOptions.forEach(option => {
    option.addEventListener('click', function() {
        turtleOptions.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        gameState.selectedPlayers = parseInt(this.getAttribute('data-players'));
    });
});

// Start game button
startGameBtn.addEventListener('click', function() {
    // Show game page first so layout sizes are available, then initialize and start
    page1.classList.remove('active-page');
    page2.classList.add('active-page');
    // wait for layout to settle
    requestAnimationFrame(() => {
        initializeGame();
        startGame();
    });
});

// Control buttons
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', restartGame);
menuBtn.addEventListener('click', () => {
    page2.classList.remove('active-page');
    page1.classList.add('active-page');
    stopGame();
});

playAgainBtn.addEventListener('click', function() {
    gameOverScreen.classList.remove('active');
    restartGame();
});

backToMenuBtn.addEventListener('click', function() {
    gameOverScreen.classList.remove('active');
    page2.classList.remove('active-page');
    page1.classList.add('active-page');
    stopGame();
});

// Initialize the game
function initializeGame() {
    // Clear the game board (wind indicator is now a top overlay)
    gameBoard.innerHTML = '';
    playerInfoDiv.innerHTML = '';

    // Create players
    gameState.players = [];
    const colorKeys = Object.keys(config.colors);

    for (let i = 0; i < gameState.selectedPlayers; i++) {
        const colorKey = colorKeys[i];
        const playerColor = config.colors[colorKey];
        const controls = config.controls[`player${i+1}`];

        const player = {
            id: i,
            name: playerColor.name,
            color: playerColor.color,
            key: playerColor.key,
            // placeholder positions; will be repositioned to corners below
            x: 0,
            y: 0,
            radius: 30,
            speed: 0.8,
            angle: 0,
            controls: controls,
            collectedItems: [],
            collectedCounts: { blackBean: 0, peanut: 0, soyaBean: 0, redBean: 0, greenBean: 0 },
            income: 0,
            pins: 0,
            savings: 0
        };

        gameState.players.push(player);

        // Create turtle element
        const turtle = document.createElement('div');
        turtle.className = 'turtle';
        turtle.id = `turtle-${i}`;
        turtle.style.backgroundColor = player.color;
        turtle.style.left = `${player.x - player.radius}px`;
        turtle.style.top = `${player.y - player.radius}px`;
        turtle.innerHTML = '<div class="turtle-head">🐢</div>';
        gameBoard.appendChild(turtle);

        // Create player stats display
        const statsDiv = document.createElement('div');
        statsDiv.className = 'player-stats';
        statsDiv.id = `player-stats-${i}`;
        statsDiv.innerHTML = `
            <div class="player-name" style="color:${player.color}">${player.name}</div>
            <div>Income: RM<span id="income-${i}">0.00</span></div>
            <div>Treatment: <span id="treatment-${i}">-RM0.00</span></div>
            <div>Savings: RM<span id="savings-${i}">0.00</span></div>
        `;
        playerInfoDiv.appendChild(statsDiv);
    }

    // Ensure initial per-player UI values reflect current state
    updatePlayerStats();

    // Create food items and pins
    gameState.items = [];

    // Create black beans (RM5)
    for (let i = 0; i < config.itemCounts.blackBeans; i++) { createItem('black-bean', config.values.blackBean); }
    for (let i = 0; i < config.itemCounts.peanuts; i++) { createItem('peanut-bean', config.values.peanut); }
    for (let i = 0; i < config.itemCounts.soyaBeans; i++) { createItem('soya-bean', config.values.soyaBean); }
    for (let i = 0; i < config.itemCounts.redBeans; i++) { createItem('red-bean', config.values.redBean); }
    for (let i = 0; i < config.itemCounts.greenBeans; i++) { createItem('green-bean', config.values.greenBean); }
    for (let i = 0; i < config.itemCounts.pins; i++) { createItem('pin', config.values.pin, true); }

    // Initialize wind
    updateWind();
    // Initialize side scores
    updateSideScores();

    // Set timer
    gameState.timeLeft = config.gameTime;
    updateTimerDisplay();

    // Place turtles at corners of gameBoard
    try {
        const rect = gameBoard.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const margin = 10 + 30; // margin + radius
        const corners = [
            { x: margin, y: margin }, // top-left
            { x: w - margin, y: margin }, // top-right
            { x: margin, y: h - margin }, // bottom-left
            { x: w - margin, y: h - margin } // bottom-right
        ];

        gameState.players.forEach((player, idx) => {
            const corner = corners[idx % 4];
            player.x = corner.x;
            player.y = corner.y;
            // face towards center
            const centerX = w / 2;
            const centerY = h / 2;
            const angle = Math.atan2(centerY - player.y, centerX - player.x) * 180 / Math.PI;
            player.angle = angle;
            const turtleElement = document.getElementById(`turtle-${player.id}`);
            if (turtleElement) {
                turtleElement.style.left = `${player.x - player.radius}px`;
                turtleElement.style.top = `${player.y - player.radius}px`;
                const head = turtleElement.querySelector('.turtle-head');
                if (head) head.style.transform = `rotate(${angle + HEAD_ROTATION_OFFSET}deg)`;
            }
        });
    } catch (e) {
        console.warn('Could not position turtles in corners', e);
    }
}

// Update the left/right side panels to show turtle scores (savings)
function updateSideScores() {
    const leftCounter = document.getElementById('left-counter');
    const rightCounter = document.getElementById('right-counter');
    if (!leftCounter || !rightCounter) return;
    // assign pink/orange to left, blue/purple to right
    const leftKeys = ['pink', 'orange'];
    const rightKeys = ['blue', 'purple'];
    const leftPlayers = gameState.players.filter(p => leftKeys.includes(p.key));
    const rightPlayers = gameState.players.filter(p => rightKeys.includes(p.key));

    leftCounter.innerHTML = '';
    rightCounter.innerHTML = '';

    function renderList(container, list) {
        if (list.length === 0) {
            container.textContent = '';
            return;
        }
        list.forEach(p => {
            const entry = document.createElement('div');
            entry.className = 'side-score-entry';
            entry.style.color = p.color;
            // show income here without deducting pins so students do the subtraction themselves
            const score = (typeof p.income === 'number') ? p.income.toFixed(2) : '0.00';
            // compute monetary totals per bean type
            const blackMoney = (p.collectedCounts.blackBean || 0) * (config.values.blackBean || 0);
            const peanutMoney = (p.collectedCounts.peanut || 0) * (config.values.peanut || 0);
            const soyaMoney = (p.collectedCounts.soyaBean || 0) * (config.values.soyaBean || 0);
            const redMoney = (p.collectedCounts.redBean || 0) * (config.values.redBean || 0);
            const greenMoney = (p.collectedCounts.greenBean || 0) * (config.values.greenBean || 0);
            entry.innerHTML = `
                <div class="side-line"><span class="side-dot" style="background:${p.color}"></span> <strong>${p.name}</strong>: RM${score}</div>
                <div class="side-bean-counts">
                    <div class="side-bean-count"><span class="bean-count-badge">${p.collectedCounts.blackBean||0}</span><span class="bean-value black-bean"></span> ${formatMoneyLabel(blackMoney)}</div>
                    <div class="side-bean-count"><span class="bean-count-badge">${p.collectedCounts.peanut||0}</span><span class="bean-value peanut-bean"></span> ${formatMoneyLabel(peanutMoney)}</div>
                    <div class="side-bean-count"><span class="bean-count-badge">${p.collectedCounts.soyaBean||0}</span><span class="bean-value soya-bean"></span> ${formatMoneyLabel(soyaMoney)}</div>
                    <div class="side-bean-count"><span class="bean-count-badge">${p.collectedCounts.redBean||0}</span><span class="bean-value red-bean"></span> ${formatMoneyLabel(redMoney)}</div>
                    <div class="side-bean-count"><span class="bean-count-badge">${p.collectedCounts.greenBean||0}</span><span class="bean-value green-bean"></span> ${formatMoneyLabel(greenMoney)}</div>
                    <div class="side-bean-count"><span class="pin-chip">📌<span class="pin-count">${p.pins}</span></span></div>
                </div>
            `;
            container.appendChild(entry);
        });
    }

    renderList(leftCounter, leftPlayers);
    renderList(rightCounter, rightPlayers);
}

// Create a food item or pin
function createItem(type, value, isPin = false) {
    // choose a non-overlapping random position inside the board
    const rect = gameBoard.getBoundingClientRect();
    const minDist = 30; // minimum distance between items
    let x = 20, y = 20;
    let attempts = 0;
    const maxAttempts = 100;

    function isTooClose(x, y) {
        return gameState.items.some(other => {
            const dx = other.x - x;
            const dy = other.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            return dist < minDist + (other.radius || 8);
        });
    }

    do {
        x = Math.random() * (Math.max(100, rect.width) - 40) + 20;
        y = Math.random() * (Math.max(100, rect.height) - 40) + 20;
        attempts++;
    } while (isTooClose(x, y) && attempts < maxAttempts);

    const item = {
        id: gameState.items.length,
        type: type,
        value: value,
        isPin: isPin,
        x: x,
        y: y,
        radius: isPin ? 15 : type === 'black-bean' ? 12.5 : type === 'peanut-bean' ? 11 : type === 'soya-bean' ? 10 : type === 'red-bean' ? 9 : 7.5,
        collected: false
    };

    gameState.items.push(item);

    // Create visual element with a small value label
    const itemElement = document.createElement('div');
    itemElement.className = isPin ? 'pin-item' : `food-item ${type}`;
    itemElement.id = `item-${item.id}`;
        // show a small label indicating the money gain/loss (format cents like "50cents")
        const displayText = formatMoneyLabel(item.value);
        itemElement.innerHTML = `<span class="item-value">${displayText}</span>`;
    itemElement.style.left = `${item.x}px`;
    itemElement.style.top = `${item.y}px`;
    itemElement.setAttribute('title', displayText);
    gameBoard.appendChild(itemElement);
}

// Format money labels: RM for whole ringgit, cents for values < RM1
function formatMoneyLabel(value) {
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    if (abs >= 1) {
        return `${sign}RM${abs.toFixed(2)}`;
    } else {
        // show cents as e.g. 50cents or 10cents (no space)
        const cents = Math.round(abs * 100);
        return `${sign}${cents}cents`;
    }
}

// Start the game
function startGame() {
    gameState.gameActive = true;
    gameState.timeLeft = config.gameTime;
    updateTimerDisplay();

    // Start game timer
    gameState.timerInterval = setInterval(function() {
        if (gameState.gameActive) {
            gameState.timeLeft--;
            updateTimerDisplay();
            if (gameState.timeLeft <= 0) { endGame(); }
        }
    }, 1000);

    // Start game loop
    gameLoop();
}

// Main game loop
function gameLoop() {
    if (!gameState.gameActive) return;
    moveItemsWithWind();
    updatePlayerPositions();
    checkCollisions();
    updatePlayerStats();
    if (Math.random() < 0.01) { updateWind(); }
    requestAnimationFrame(gameLoop);
}

// Move items with wind
function moveItemsWithWind() {
    gameState.items.forEach((item) => {
        if (!item.collected) {
            item.x += gameState.windDirection.x * gameState.windStrength;
            item.y += gameState.windDirection.y * gameState.windStrength;
            if (item.x < 10) item.x = 10;
            if (item.x > gameBoard.offsetWidth - 20) item.x = gameBoard.offsetWidth - 20;
            if (item.y < 10) item.y = 10;
            if (item.y > gameBoard.offsetHeight - 20) item.y = gameBoard.offsetHeight - 20;
            const itemElement = document.getElementById(`item-${item.id}`);
            if (itemElement) { itemElement.style.left = `${item.x}px`; itemElement.style.top = `${item.y}px`; }
        }
    });
}

// Update wind direction and strength
function updateWind() {
    gameState.windDirection = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
    gameState.windStrength = 0.2 + Math.random() * 0.6;
    const windStrengthText = document.getElementById('wind-strength');
    if (windStrengthText) {
        if (gameState.windStrength < 0.4) windStrengthText.textContent = "Gentle";
        else if (gameState.windStrength < 0.7) windStrengthText.textContent = "Moderate";
        else windStrengthText.textContent = "Strong";
    }
}

// Keyboard input tracking
const keyState = {};
document.addEventListener('keydown', function(event) {
    // prevent page from scrolling when using arrow keys or space
    const raw = event.key;
    const keyLower = raw.toLowerCase();
    if (raw === ' ' || event.code === 'Space' || keyLower.startsWith('arrow')) {
        event.preventDefault();
    }
    keyState[keyLower] = true;
});

document.addEventListener('keyup', function(event) {
    const raw = event.key;
    const keyLower = raw.toLowerCase();
    if (raw === ' ' || event.code === 'Space' || keyLower.startsWith('arrow')) {
        event.preventDefault();
    }
    keyState[keyLower] = false;
});

// Update player positions based on keyboard input
function updatePlayerPositions() {
    gameState.players.forEach(player => {
        let moved = false;
        const oldX = player.x;
        const oldY = player.y;
        if (keyState[player.controls.up]) { player.y -= player.speed; moved = true; }
        if (keyState[player.controls.down]) { player.y += player.speed; moved = true; }
        if (keyState[player.controls.left]) { player.x -= player.speed; moved = true; }
        if (keyState[player.controls.right]) { player.x += player.speed; moved = true; }
        // support multiple representations for spacebar gust
        const gustPressed = keyState[player.controls.gust] || keyState[' '] || keyState['space'] || keyState['spacebar'];
        if (gustPressed) { createGust(player.x, player.y, player.id); }
        if (player.x < player.radius) player.x = player.radius;
        if (player.x > gameBoard.offsetWidth - player.radius) player.x = gameBoard.offsetWidth - player.radius;
        if (player.y < player.radius) player.y = player.radius;
        if (player.y > gameBoard.offsetHeight - player.radius) player.y = gameBoard.offsetHeight - player.radius;
        if (moved) {
            const turtleElement = document.getElementById(`turtle-${player.id}`);
            if (turtleElement) { turtleElement.style.left = `${player.x - player.radius}px`; turtleElement.style.top = `${player.y - player.radius}px`; }
            // update facing direction based on movement vector
            const dx = player.x - oldX;
            const dy = player.y - oldY;
            if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                const angle = Math.atan2(dy, dx) * 180 / Math.PI; // degrees
                player.angle = angle;
                const turtleElement = document.getElementById(`turtle-${player.id}`);
                if (turtleElement) {
                    const head = turtleElement.querySelector('.turtle-head');
                    if (head) head.style.transform = `rotate(${angle + HEAD_ROTATION_OFFSET}deg)`;
                }
            }
        }
    });
}

// Create a gust of wind from player position
function createGust(x, y, playerId) {
    gameState.items.forEach(item => {
        if (!item.collected) {
            const distance = Math.sqrt((item.x - x) ** 2 + (item.y - y) ** 2);
            if (distance < 150) {
                const angle = Math.atan2(item.y - y, item.x - x);
                const force = 5;
                item.x += Math.cos(angle) * force;
                item.y += Math.sin(angle) * force;
                const itemElement = document.getElementById(`item-${item.id}`);
                if (itemElement) { itemElement.style.left = `${item.x}px`; itemElement.style.top = `${item.y}px`; }
            }
        }
    });
}

// Check for collisions between turtles and items
function checkCollisions() {
    gameState.players.forEach(player => {
        gameState.items.forEach(item => {
            if (!item.collected) {
                const distance = Math.sqrt((item.x - player.x) ** 2 + (item.y - player.y) ** 2);
                if (distance < player.radius + item.radius) {
                    item.collected = true;
                    player.collectedItems.push(item);
                    if (item.isPin) {
                        player.pins++;
                    } else {
                        player.income += item.value;
                        // increment per-bean counters
                        if (item.type === 'black-bean') player.collectedCounts.blackBean++;
                        else if (item.type === 'peanut-bean') player.collectedCounts.peanut++;
                        else if (item.type === 'soya-bean') player.collectedCounts.soyaBean++;
                        else if (item.type === 'red-bean') player.collectedCounts.redBean++;
                        else if (item.type === 'green-bean') player.collectedCounts.greenBean++;
                    }
                    player.savings = player.income + (player.pins * config.values.pin);
                    const itemElement = document.getElementById(`item-${item.id}`);
                    if (itemElement) itemElement.style.display = 'none';
                    const turtleElement = document.getElementById(`turtle-${player.id}`);
                    if (turtleElement) {
                        const ang = (typeof player.angle === 'number') ? player.angle : 0;
                        const head = turtleElement.querySelector('.turtle-head');
                        if (head) {
                            head.style.transform = `rotate(${ang + HEAD_ROTATION_OFFSET}deg) scale(1.2)`;
                            setTimeout(() => { head.style.transform = `rotate(${ang + HEAD_ROTATION_OFFSET}deg) scale(1)`; }, 200);
                        }
                    }
                }
            }
        });
    });

    // update side scores after any collection
    updateSideScores();

    // update player stat blocks as well so treatment shows immediately
    updatePlayerStats();

    // If all items collected, end game
    if (gameState.items.every(it => it.collected)) {
        endGame();
    }
}

// Update player stats display
function updatePlayerStats() {
    gameState.players.forEach(player => {
        const incomeElement = document.getElementById(`income-${player.id}`);
        const treatmentElement = document.getElementById(`treatment-${player.id}`);
        const savingsElement = document.getElementById(`savings-${player.id}`);
        if (incomeElement) incomeElement.textContent = player.income.toFixed(2);
        if (treatmentElement) {
            const perPin = Math.abs(config.values.pin || 0);
            const deduction = player.pins * perPin; // positive value for display
            treatmentElement.textContent = `-RM${deduction.toFixed(2)}`;
        }
        if (savingsElement) savingsElement.textContent = player.savings.toFixed(2);
        // update per-bean counts in the player's stat block
        const blackEl = document.getElementById(`black-${player.id}`);
        const peanutEl = document.getElementById(`peanut-${player.id}`);
        const soyaEl = document.getElementById(`soya-${player.id}`);
        const redEl = document.getElementById(`red-${player.id}`);
        const greenEl = document.getElementById(`green-${player.id}`);
        if (blackEl) blackEl.textContent = player.collectedCounts.blackBean;
        if (peanutEl) peanutEl.textContent = player.collectedCounts.peanut;
        if (soyaEl) soyaEl.textContent = player.collectedCounts.soyaBean;
        if (redEl) redEl.textContent = player.collectedCounts.redBean;
        if (greenEl) greenEl.textContent = player.collectedCounts.greenBean;
    });
    // keep side scores in sync
    updateSideScores();
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (gameState.timeLeft <= 10) timerDisplay.style.color = '#FF6B6B'; else timerDisplay.style.color = '#FFD700';
}

// Toggle player info visibility (hide/show)
const togglePlayerInfoBtn = document.getElementById('toggle-player-info');
if (togglePlayerInfoBtn) {
    togglePlayerInfoBtn.addEventListener('click', function() {
        const info = document.getElementById('player-info');
        if (!info) return;
        if (info.classList.contains('hidden')) {
            info.classList.remove('hidden');
            this.textContent = 'Hide Player Info 👁️';
        } else {
            info.classList.add('hidden');
            this.textContent = 'Show Player Info 👁️';
        }
    });
}

// Toggle pause state
function togglePause() {
    gameState.gameActive = !gameState.gameActive;
    pauseBtn.textContent = gameState.gameActive ? 'Pause Game ⏸️' : 'Resume Game ▶️';
    if (gameState.gameActive) gameLoop();
}

// Restart the game
function restartGame() { stopGame(); initializeGame(); startGame(); }

// Stop the game
function stopGame() {
    gameState.gameActive = false;
    if (gameState.timerInterval) { clearInterval(gameState.timerInterval); gameState.timerInterval = null; }
}

// End the game and show results
function endGame() {
    stopGame();
    gameState.players.forEach(player => { player.savings = player.income + (player.pins * config.values.pin); });
    const sortedPlayers = [...gameState.players].sort((a,b) => { if (b.savings !== a.savings) return b.savings - a.savings; return a.pins - b.pins; });
    const winner = sortedPlayers[0];
    winnerText.textContent = `${winner.name} Wins!`;
    resultsTable.innerHTML = '';
    sortedPlayers.forEach(player => {
        const row = resultsTable.insertRow();
        row.innerHTML = `<td style="color:${player.color}">${player.name}</td><td>RM${player.income.toFixed(2)}</td><td>${player.pins}</td><td>RM${(player.pins*config.values.pin).toFixed(2)}</td><td>RM${player.savings.toFixed(2)}</td>`;
    });
    gameOverScreen.classList.add('active');
}

// No automatic initialization on load; game starts when user clicks Start.
