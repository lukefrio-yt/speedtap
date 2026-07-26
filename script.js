let games = JSON.parse(localStorage.getItem('speedTapGames')) || [];
let activeGame = null;
let gameState = 'waiting'; 
let timeoutId = null;

let localUser = JSON.parse(localStorage.getItem('speedTapUser')) || null;
let userData = localUser ? localUser : { 
    username: '', 
    coins: 100,
    ownedItems: [],
    equippedFrame: null,
    equippedBg: null,
    equippedFont: null,
    activeBoost: 1 // Načtený násobič coinů
};

// MNOHEM BOHATŠÍ OBCHOD (12+ POLOŽEK VČETNĚ ANIMACÍ & BOOSTŮ)
const shopCatalog = [
    // RÁMEČKY
    { id: 'frame-gold', name: 'Zlatý rámec', desc: 'Zlatá záře kolem celé aplikace', type: 'frame', price: 150, icon: 'fa-solid fa-crown', color: '#fbbf24' },
    { id: 'frame-neon', name: 'Neonový rámec', desc: 'Světlounce modrá neonová záře', type: 'frame', price: 100, icon: 'fa-solid fa-bolt', color: '#38bdf8' },
    { id: 'frame-ruby', name: 'Rubínový rámec', desc: 'Krvavě červená záře okrajů', type: 'frame', price: 200, icon: 'fa-solid fa-gem', color: '#ef4444' },
    { id: 'frame-emerald', name: 'Smaragdový rámec', desc: 'Zelený svítivý efekt', type: 'frame', price: 180, icon: 'fa-solid fa-leaf', color: '#10b981' },
    { id: 'frame-rainbow', name: 'Duhový Rámec (Animovaný)', desc: 'Prestižní měnící se barvy!', type: 'frame', price: 600, icon: 'fa-solid fa-wand-magic-sparkles', color: '#ec4899' },
    { id: 'frame-void', name: 'Void / Temná Hmota', desc: 'Pulzující fialová aura', type: 'frame', price: 850, icon: 'fa-solid fa-atom', color: '#a855f7' },

    // BARVY PÍSMA (ZNAKŮ)
    { id: 'font-neon', name: 'Zelené Písmo', desc: 'Písmena září neonově zeleně', type: 'font', price: 120, icon: 'fa-solid fa-font', color: '#22c55e' },
    { id: 'font-gold', name: 'Zlaté Písmo', desc: 'Královská zlatá barva znaků', type: 'font', price: 200, icon: 'fa-solid fa-font', color: '#fbbf24' },
    { id: 'font-pink', name: 'Cyber Pink Písmo', desc: 'Zářivá kybernetická růžová', type: 'font', price: 250, icon: 'fa-solid fa-font', color: '#ec4899' },

    // POZADÍ
    { id: 'bg-space', name: 'Temný Vesmír', desc: 'Hluboké fialové vesmírné pozadí', type: 'bg', price: 250, icon: 'fa-solid fa-user-astronaut', color: '#a855f7' },
    { id: 'bg-fire', name: 'Ohnivé Peklo', desc: 'Temně teplé horké pozadí', type: 'bg', price: 250, icon: 'fa-solid fa-fire', color: '#f97316' },
    { id: 'bg-cyber', name: 'Kyberpunk', desc: 'Neonově magenta atmosféra', type: 'bg', price: 300, icon: 'fa-solid fa-vr-cardboard', color: '#ec4899' },
    { id: 'bg-gold', name: 'Královské Kasino', desc: 'Luxusní hnědo-zlatý nádech', type: 'bg', price: 400, icon: 'fa-solid fa-coins', color: '#fbbf24' },

    // BOOSTY (JEDNORÁZOVÉ)
    { id: 'boost-2x', name: '2x Coin Boost', desc: 'Zdvojnásobí coiny z příští hry', type: 'boost', multiplier: 2, price: 80, icon: 'fa-solid fa-angles-up', color: '#22c55e' },
    { id: 'boost-3x', name: '3x MEGA Boost', desc: 'Ztrojnásobí coiny z příští hry!', type: 'boost', multiplier: 3, price: 180, icon: 'fa-solid fa-rocket', color: '#ef4444' }
];

const diffKeys = {
    1: "ASDFJKL",
    2: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    3: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    4: "!?@#$%&*+-=",
    5: "ABCDEFGHIJKLMNOPQRSTUVWXYZ!?@#$%&*+-=0123456789"
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq, dur, type = 'sine', vol = 0.1) {
    try {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = type; osc.frequency.value = freq;
        g.gain.setValueAtTime(vol, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch(e) {}
}

function showNotification(text, iconClass = "fa-solid fa-circle-check") {
    const notif = document.getElementById('game-notification');
    const notifText = document.getElementById('notif-text');
    const notifIcon = document.getElementById('notif-icon');
    if (!notif || !notifText) return;

    notifText.textContent = text;
    if(notifIcon) notifIcon.className = iconClass;
    
    notif.classList.add('show');
    setTimeout(() => { notif.classList.remove('show'); }, 2500);
}

const screens = {};

document.addEventListener('DOMContentLoaded', () => {
    screens.menu = document.getElementById('screen-menu');
    screens.setup = document.getElementById('screen-setup');
    screens.soloSetup = document.getElementById('screen-solo-setup');
    screens.game = document.getElementById('screen-game');
    screens.soloGame = document.getElementById('screen-solo-game');
    screens.shop = document.getElementById('screen-shop');
    screens.stats = document.getElementById('screen-stats');

    if(!userData.ownedItems) userData.ownedItems = [];
    if(!userData.activeBoost) userData.activeBoost = 1;

    updateUIUser();
    applyEquippedSkins();
    renderGameHistory();
    setupEventListeners();
});

function showScreen(name) {
    Object.values(screens).forEach(s => { if(s) s.classList.remove('active'); });
    if(screens[name]) screens[name].classList.add('active');
}

function applyEquippedSkins() {
    const appContainer = document.getElementById('app-container');
    const body = document.body;

    if (appContainer) {
        appContainer.className = 'app-container';
        if (userData.equippedFrame) {
            appContainer.classList.add(userData.equippedFrame);
        }
    }

    if (body) {
        body.className = '';
        if (userData.equippedBg) body.classList.add(userData.equippedBg);
        if (userData.equippedFont) body.classList.add(userData.equippedFont);
    }
}

function updateUIUser() {
    const infoBar = document.getElementById('user-info-bar');
    const loginBtn = document.getElementById('login-open-btn');
    if (!infoBar || !loginBtn) return;

    if (userData.username) {
        infoBar.style.display = 'flex';
        loginBtn.style.display = 'none';
        const userDisplay = document.getElementById('logged-user-display');
        const coinsDisplay = document.getElementById('coins-display');
        
        let boostText = userData.activeBoost > 1 ? ` (${userData.activeBoost}x Boost)` : '';
        if(userDisplay) userDisplay.innerHTML = `<i class="fa-solid fa-user-ninja"></i> ${userData.username}`;
        if(coinsDisplay) coinsDisplay.innerHTML = `<i class="fa-solid fa-coins"></i> ${userData.coins} C${boostText}`;
    } else {
        infoBar.style.display = 'none';
        loginBtn.style.display = 'block';
    }
}

// LOGIKA OBCHODU - UŽ JEDNOU KOUPENÉ VĚCI SE NEMUSÍ KUPOVAT ZNOVU
function renderShop() {
    const grid = document.getElementById('shop-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    shopCatalog.forEach(item => {
        const isOwned = userData.ownedItems.includes(item.id);
        const isEquipped = (item.type === 'frame' && userData.equippedFrame === item.id) || 
                           (item.type === 'bg' && userData.equippedBg === item.id) ||
                           (item.type === 'font' && userData.equippedFont === item.id);

        const card = document.createElement('div');
        card.className = 'shop-item';

        let btnText = `Koupit (${item.price} C)`;
        let btnClass = 'action-btn primary-btn';

        if (item.type === 'boost') {
            btnText = `Aktivovat (${item.price} C)`;
            if (userData.activeBoost === item.multiplier) {
                btnText = 'Aktivní!';
                btnClass = 'action-btn equipped-btn';
            }
        } else if (isOwned) {
            if (isEquipped) {
                btnText = 'Použito';
                btnClass = 'action-btn equipped-btn';
            } else {
                btnText = 'Použít';
                btnClass = 'action-btn secondary-btn';
            }
        }

        card.innerHTML = `
            <div class="shop-item-info">
                <h4><i class="${item.icon}" style="color: ${item.color};"></i> ${item.name}</h4>
                <p>${item.desc}</p>
            </div>
            <button class="${btnClass}" onclick="handleShopClick('${item.id}')">${btnText}</button>
        `;
        grid.appendChild(card);
    });
}

window.handleShopClick = function(itemId) {
    const item = shopCatalog.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'boost') {
        if (userData.coins >= item.price) {
            userData.coins -= item.price;
            userData.activeBoost = item.multiplier;
            localStorage.setItem('speedTapUser', JSON.stringify(userData));
            updateUIUser();
            renderShop();
            showNotification(`Aktivován ${item.name}!`);
        } else {
            showNotification("Nemáš dostatek coinů!", "fa-solid fa-triangle-exclamation");
        }
        return;
    }

    const isOwned = userData.ownedItems.includes(itemId);

    if (isOwned) {
        // Změna vybavení (již zakoupeno)
        if (item.type === 'frame') {
            userData.equippedFrame = (userData.equippedFrame === itemId) ? null : itemId;
        } else if (item.type === 'bg') {
            userData.equippedBg = (userData.equippedBg === itemId) ? null : itemId;
        } else if (item.type === 'font') {
            userData.equippedFont = (userData.equippedFont === itemId) ? null : itemId;
        }
        localStorage.setItem('speedTapUser', JSON.stringify(userData));
        applyEquippedSkins();
        renderShop();
        showNotification("Vzhled byl změněn!");
    } else {
        // První nákup předmětu
        if (userData.coins >= item.price) {
            userData.coins -= item.price;
            userData.ownedItems.push(itemId);
            
            if (item.type === 'frame') userData.equippedFrame = itemId;
            if (item.type === 'bg') userData.equippedBg = itemId;
            if (item.type === 'font') userData.equippedFont = itemId;

            localStorage.setItem('speedTapUser', JSON.stringify(userData));
            updateUIUser();
            applyEquippedSkins();
            renderShop();
            showNotification(`Zakoupeno: ${item.name}!`);
        } else {
            showNotification("Nemáš dostatek coinů!", "fa-solid fa-triangle-exclamation");
        }
    }
};

function renderGameHistory() {
    const listContainer = document.getElementById('game-list');
    if (!listContainer) return;
    
    if (games.length === 0) {
        listContainer.innerHTML = `<p style="color: #64748b; font-size: 0.85rem; text-align: center; padding: 10px;">Zatím žádné odehrané souboje.</p>`;
        return;
    }

    listContainer.innerHTML = '';
    games.slice(-5).reverse().forEach((g) => {
        const item = document.createElement('div');
        item.style.cssText = "font-size: 0.85rem; color: #94a3b8; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;";
        if (g.type === 'solo') {
            item.innerHTML = `<span><i class="fa-solid fa-user"></i> Trénink (${g.name})</span> <span style="color: #38bdf8;">${g.score} tref</span>`;
        } else {
            let winner = g.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
            item.innerHTML = `<span><i class="fa-solid fa-users"></i> Souboj (${g.players.length} hráči)</span> <span style="color: #22c55e;">Vítěz: ${winner.name}</span>`;
        }
        listContainer.appendChild(item);
    });
}

function safeClick(id, callback) {
    const el = document.getElementById(id);
    if (el) el.onclick = callback;
}

function setupEventListeners() {
    const modalLogin = document.getElementById('modal-login');
    const usernameInput = document.getElementById('auth-username-input');

    safeClick('login-open-btn', () => { 
        if(usernameInput) usernameInput.value = userData.username || '';
        if(modalLogin) modalLogin.style.display = 'flex'; 
    });
    
    safeClick('login-cancel-btn', () => { if(modalLogin) modalLogin.style.display = 'none'; });

    safeClick('auth-submit-btn', () => {
        if (!usernameInput) return;
        const username = usernameInput.value.trim();
        if (!username) {
            showNotification("Zadej uživatelské jméno!", "fa-solid fa-triangle-exclamation");
            return;
        }
        userData.username = username;
        localStorage.setItem('speedTapUser', JSON.stringify(userData));
        if(modalLogin) modalLogin.style.display = 'none';
        updateUIUser();
        showNotification("Přihlášeno jako: " + username);
    });

    safeClick('logout-btn', () => {
        userData.username = '';
        userData.coins = 100;
        userData.ownedItems = [];
        userData.equippedFrame = null;
        userData.equippedBg = null;
        userData.equippedFont = null;
        userData.activeBoost = 1;
        localStorage.removeItem('speedTapUser');
        updateUIUser();
        applyEquippedSkins();
        showNotification("Byl jsi odhlášen.");
    });

    safeClick('shop-open-btn', () => { renderShop(); showScreen('shop'); });
    safeClick('shop-back-btn', () => showScreen('menu'));

    const playersCountSelect = document.getElementById('players-count');
    if(playersCountSelect) {
        playersCountSelect.onchange = (e) => {
            const count = parseInt(e.target.value);
            const container = document.getElementById('players-names-grid');
            if(!container) return;
            container.innerHTML = '';
            for (let i = 1; i <= count; i++) {
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `p${i}-name`;
                input.placeholder = `Hráč ${i}`;
                input.maxLength = 12;
                input.className = 'custom-input';
                container.appendChild(input);
            }
        };
    }

    const controlModeSelect = document.getElementById('control-mode');
    if(controlModeSelect) {
        controlModeSelect.onchange = (e) => {
            const diffBox = document.getElementById('difficulty-box');
            if(diffBox) diffBox.style.display = e.target.value === 'keys' ? 'flex' : 'none';
        };
    }

    safeClick('new-game-btn', () => showScreen('setup'));
    safeClick('setup-back-btn', () => showScreen('menu'));
    
    safeClick('setup-start-btn', () => {
        const pCountSelect = document.getElementById('players-count');
        const pCount = pCountSelect ? parseInt(pCountSelect.value) : 2;
        let players = [];
        for (let i = 1; i <= pCount; i++) {
            let nameField = document.getElementById(`p${i}-name`);
            let name = nameField && nameField.value.trim() ? nameField.value.trim() : `Hráč ${i}`;
            players.push({ name, score: 0 });
        }

        const controlModeEl = document.getElementById('control-mode');
        const diffLevelEl = document.getElementById('difficulty-level');
        const roundsCountEl = document.getElementById('rounds-count');

        activeGame = {
            type: 'multi',
            players,
            mode: controlModeEl ? controlModeEl.value : 'tap',
            diff: diffLevelEl ? parseInt(diffLevelEl.value) : 1,
            maxRounds: roundsCountEl ? parseInt(roundsCountEl.value) : 10,
            roundStartTime: 0,
            reactions: [],
            falseStarts: 0
        };
        startMultiGame();
    });

    safeClick('solo-mode-btn', () => {
        const soloNameInput = document.getElementById('solo-name');
        if (soloNameInput && userData.username) soloNameInput.value = userData.username;
        showScreen('soloSetup');
    });

    safeClick('solo-back-btn', () => showScreen('menu'));
    
    const soloModeTypeEl = document.getElementById('solo-mode-type');
    if(soloModeTypeEl) {
        soloModeTypeEl.onchange = (e) => {
            const soloDiffBox = document.getElementById('solo-diff-box');
            if(soloDiffBox) soloDiffBox.style.display = e.target.value === 'keys' ? 'flex' : 'none';
        };
    }

    safeClick('solo-start-btn', () => {
        const soloNameInput = document.getElementById('solo-name');
        const soloModeTypeEl = document.getElementById('solo-mode-type');
        const soloDiffLevelEl = document.getElementById('solo-diff-level');

        const name = soloNameInput && soloNameInput.value.trim() ? soloNameInput.value.trim() : (userData.username ? userData.username : "Trénující");
        activeGame = {
            type: 'solo',
            name,
            mode: soloModeTypeEl ? soloModeTypeEl.value : 'tap',
            diff: soloDiffLevelEl ? parseInt(soloDiffLevelEl.value) : 1,
            score: 0,
            errors: 0, // Sledování chyb
            timeLeft: 30,
            timerId: null,
            reactions: [],
            isPenalized: false
        };
        startSoloGame();
    });

    safeClick('stats-back-btn', () => showScreen('menu'));

    window.onkeydown = (e) => {
        if (screens.game && screens.game.classList.contains('active') && activeGame && activeGame.mode === 'keys') {
            handleMultiInput(null, e.key);
        } else if (screens.soloGame && screens.soloGame.classList.contains('active') && activeGame && activeGame.mode === 'keys') {
            handleSoloInput(e.key);
        }
    };

    const soloTargetBox = document.getElementById('solo-target-box');
    if (soloTargetBox) {
        soloTargetBox.onpointerdown = () => {
            if (screens.soloGame && screens.soloGame.classList.contains('active') && activeGame && activeGame.mode === 'tap') {
                handleSoloInput();
            }
        };
    }

    safeClick('quit-game-btn', () => { clearTimeout(timeoutId); showScreen('menu'); });
    safeClick('quit-solo-btn', () => { if(activeGame) clearInterval(activeGame.timerId); showScreen('menu'); });
    safeClick('rules-open-btn', () => { const rulesModal = document.getElementById('modal-rules'); if(rulesModal) rulesModal.style.display = 'flex'; });
    safeClick('rules-close-btn', () => { const rulesModal = document.getElementById('modal-rules'); if(rulesModal) rulesModal.style.display = 'none'; });
}

function startMultiGame() {
    showScreen('game');
    const container = document.getElementById('game-grid-container');
    if(!container) return;
    container.className = `game-grid-${activeGame.players.length}`;
    container.innerHTML = '';

    activeGame.players.forEach((p, idx) => {
        const box = document.createElement('div');
        box.className = 'player-box';
        box.id = `player-box-${idx + 1}`;
        box.innerHTML = `
            <div class="p-info">
                <h4>${p.name}</h4>
                <span id="score-${idx + 1}" class="score">0</span>
            </div>
            <div class="target-key" id="target-${idx + 1}">?</div>
        `;
        if (activeGame.mode === 'tap') {
            box.onpointerdown = () => { if(gameState === 'go') handleMultiInput(idx + 1); else if(gameState === 'waiting') handleFalseStart(idx + 1); };
        }
        container.appendChild(box);
    });
    updateMultiScores();
    nextMultiRound();
}

function updateMultiScores() {
    activeGame.players.forEach((p, idx) => {
        const el = document.getElementById(`score-${idx + 1}`);
        if (el) el.textContent = p.score;
    });
}

function nextMultiRound() {
    gameState = 'waiting';
    const statusMsg = document.getElementById('status-msg');
    if(statusMsg) statusMsg.textContent = "PŘIPRAV SE...";
    
    activeGame.players.forEach((_, idx) => {
        const t = document.getElementById(`target-${idx + 1}`);
        if(t) t.classList.remove('show-key', 'winner-glow');
    });

    const delay = Math.random() * 2500 + 1500;
    timeoutId = setTimeout(() => {
        gameState = 'go';
        activeGame.roundStartTime = performance.now();
        beep(700, 0.15, 'square');
        if(statusMsg) statusMsg.textContent = "TEĎ! ⚡";
        
        if (activeGame.mode === 'keys') {
            const charset = diffKeys[activeGame.diff];
            let keys = [];
            while(keys.length < activeGame.players.length) {
                let k = charset[Math.floor(Math.random() * charset.length)];
                if(!keys.includes(k)) keys.push(k);
            }
            activeGame.currentKeys = keys;
            keys.forEach((k, idx) => {
                const t = document.getElementById(`target-${idx + 1}`);
                if(t) {
                    t.textContent = k;
                    t.classList.add('show-key');
                }
            });
        } else {
            activeGame.players.forEach((_, idx) => {
                const t = document.getElementById(`target-${idx + 1}`);
                if(t) {
                    t.textContent = "TAP";
                    t.classList.add('show-key');
                }
            });
        }
    }, delay);
}

function handleFalseStart(playerIdx) {
    clearTimeout(timeoutId);
    gameState = 'result';
    beep(180, 0.4, 'sawtooth');
    activeGame.falseStarts++;
    const statusMsg = document.getElementById('status-msg');
    if(statusMsg) statusMsg.textContent = `FALEŠNÝ START (${activeGame.players[playerIdx-1].name})! ❌`;
    setTimeout(nextMultiRound, 2000);
}

function handleMultiInput(winnerIdx, inputKey = null) {
    if (gameState === 'waiting') {
        handleFalseStart(winnerIdx);
        return;
    }
    if (gameState !== 'go') return;

    if (activeGame.mode === 'keys') {
        const keyIdx = activeGame.currentKeys.indexOf(inputKey.toUpperCase());
        if (keyIdx === -1) return;
        winnerIdx = keyIdx + 1;
    }

    gameState = 'result';
    const reactionTime = Math.round(performance.now() - activeGame.roundStartTime);
    activeGame.reactions.push(reactionTime);
    
    beep(1000, 0.2, 'sine');
    const pts = activeGame.mode === 'keys' && activeGame.diff >= 3 ? 2 : 1;
    activeGame.players[winnerIdx - 1].score += pts;

    const targetEl = document.getElementById(`target-${winnerIdx}`);
    if(targetEl) targetEl.classList.add('winner-glow');
    
    const statusMsg = document.getElementById('status-msg');
    if(statusMsg) statusMsg.textContent = `${activeGame.players[winnerIdx-1].name} +${pts} BOD! (${reactionTime}ms)`;

    updateMultiScores();

    let maxScore = Math.max(...activeGame.players.map(p => p.score));
    if (maxScore >= activeGame.maxRounds) {
        setTimeout(showStatsScreen, 2000);
    } else {
        setTimeout(nextMultiRound, 2200);
    }
}

function startSoloGame() {
    showScreen('soloGame');
    const displayNameEl = document.getElementById('solo-display-name');
    if(displayNameEl) displayNameEl.textContent = activeGame.name;
    
    activeGame.score = 0;
    activeGame.errors = 0;
    activeGame.timeLeft = 30;
    activeGame.isPenalized = false;
    
    const scoreEl = document.getElementById('solo-score');
    const timerEl = document.getElementById('solo-timer');
    if(scoreEl) scoreEl.textContent = 0;
    if(timerEl) timerEl.innerHTML = `<i class="fa-regular fa-clock"></i> Čas: 30s`;

    const target = document.getElementById('solo-target');
    if(target) target.classList.add('show-key');
    nextSoloPrompt();

    activeGame.timerId = setInterval(() => {
        activeGame.timeLeft--;
        if(timerEl) timerEl.innerHTML = `<i class="fa-regular fa-clock"></i> Čas: ${activeGame.timeLeft}s`;
        if (activeGame.timeLeft <= 0) {
            clearInterval(activeGame.timerId);
            showStatsScreen();
        }
    }, 1000);
}

function nextSoloPrompt() {
    const target = document.getElementById('solo-target');
    if (!target) return;

    if (activeGame.mode === 'keys') {
        const charset = diffKeys[activeGame.diff];
        activeGame.currentKey = charset[Math.floor(Math.random() * charset.length)];
        target.textContent = activeGame.currentKey;
    } else {
        target.textContent = "TAP";
    }
    activeGame.soloPromptTime = performance.now();
}

// LOGIKA CHYBY V TRÉNINKU (3 SEKUNDY PENALTA)
function handleSoloInput(key = null) {
    if (activeGame.timeLeft <= 0 || activeGame.isPenalized) return;

    if (activeGame.mode === 'keys' && (!key || key.toUpperCase() !== activeGame.currentKey)) {
        // Hráč stiskl ŠPATNOU KLÁVESU!
        activeGame.errors++;
        activeGame.isPenalized = true;
        beep(150, 0.4, 'sawtooth');

        const overlay = document.getElementById('penalty-overlay');
        const penaltyTimer = document.getElementById('penalty-timer');
        if (overlay && penaltyTimer) {
            overlay.style.display = 'flex';
            let countdown = 3;
            penaltyTimer.textContent = countdown;

            let penaltyInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    penaltyTimer.textContent = countdown;
                } else {
                    clearInterval(penaltyInterval);
                    overlay.style.display = 'none';
                    activeGame.isPenalized = false;
                    nextSoloPrompt();
                }
            }, 1000);
        }
        return;
    }

    // Správná klávesa
    let rt = Math.round(performance.now() - activeGame.soloPromptTime);
    activeGame.reactions.push(rt);
    activeGame.score += 1;
    const scoreEl = document.getElementById('solo-score');
    if(scoreEl) scoreEl.textContent = activeGame.score;
    beep(900, 0.1, 'sine');
    nextSoloPrompt();
}

function showStatsScreen() {
    showScreen('stats');
    const content = document.getElementById('stats-content');
    if(!content) return;
    
    let avgReaction = activeGame.reactions.length ? Math.round(activeGame.reactions.reduce((a,b)=>a+b,0) / activeGame.reactions.length) : 0;
    
    let baseCoins = 0;
    if (activeGame.type === 'solo') {
        // Trest za chyby: každá chyba odečte 2 coiny
        let errorPenalty = activeGame.errors * 2;
        baseCoins = Math.max(0, Math.floor(activeGame.score * (activeGame.mode === 'keys' ? 1.5 : 0.8)) - errorPenalty);
    } else {
        let diffMultiplier = activeGame.diff >= 4 ? 3 : (activeGame.diff >= 2 ? 2 : 1);
        let maxScore = Math.max(...activeGame.players.map(p => p.score));
        baseCoins = maxScore * diffMultiplier * 2;
    }

    // Aplikace násobiče z obchodu (2x / 3x Boost)
    let finalCoins = baseCoins * userData.activeBoost;

    userData.coins += finalCoins;
    let usedBoostMultiplier = userData.activeBoost;
    userData.activeBoost = 1; // Boost se po zápasu spotřebuje

    localStorage.setItem('speedTapUser', JSON.stringify(userData));
    games.push(activeGame);
    localStorage.setItem('speedTapGames', JSON.stringify(games));
    renderGameHistory();

    if (activeGame.type === 'solo') {
        content.innerHTML = `
            <p><strong><i class="fa-solid fa-gamepad"></i> Režim:</strong> Trénink (Solo)</p>
            <p><strong><i class="fa-solid fa-bolt"></i> Úspěšné trefy:</strong> ${activeGame.score}</p>
            <p><strong><i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i> Počet chyb:</strong> ${activeGame.errors} (Penalta)</p>
            <p><strong><i class="fa-solid fa-stopwatch"></i> Průměrná reakce:</strong> ${avgReaction} ms</p>
            ${usedBoostMultiplier > 1 ? `<p style="color:#22c55e;"><strong><i class="fa-solid fa-rocket"></i> Použit Boost:</strong> ${usedBoostMultiplier}x</p>` : ''}
            <p style="color:#fbbf24; margin-top:5px; font-size: 1.1rem;"><strong><i class="fa-solid fa-coins"></i> Získané coiny:</strong> +${finalCoins} C</p>
        `;
    } else {
        let winner = activeGame.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
        content.innerHTML = `
            <p><strong><i class="fa-solid fa-trophy" style="color:#fbbf24;"></i> Vítěz:</strong> ${winner.name} (${winner.score} bodů)</p>
            <p><strong><i class="fa-solid fa-stopwatch"></i> Průměrná reakce:</strong> ${avgReaction} ms</p>
            <p><strong><i class="fa-solid fa-triangle-exclamation"></i> Falešné starty:</strong> ${activeGame.falseStarts}</p>
            ${usedBoostMultiplier > 1 ? `<p style="color:#22c55e;"><strong><i class="fa-solid fa-rocket"></i> Použit Boost:</strong> ${usedBoostMultiplier}x</p>` : ''}
            <p style="color:#fbbf24; margin-top:5px; font-size: 1.1rem;"><strong><i class="fa-solid fa-coins"></i> Získané coiny:</strong> +${finalCoins} C</p>
        `;
    }
    updateUIUser();
}
