/* ==========================================================================
   MAIN ENTRY POINT & UI CONTROLLER
   Menu Handlers, DOM HUD Data Bindings, Dynamic Shop Generator & Game Loop
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Subsystems
    const storageManager = new StorageManager();
    const audioManager = new AudioManager(storageManager);
    const inputManager = new InputManager();
    const mobileController = new MobileController();

    const game = new Game(storageManager, audioManager, inputManager, mobileController);

    // DOM Screen Elements
    const mainMenuScreen = document.getElementById('main-menu');
    const gameContainerScreen = document.getElementById('game-container');

    // Modals
    const upgradeModal = document.getElementById('upgrade-modal');
    const pauseModal = document.getElementById('pause-modal');
    const gameoverModal = document.getElementById('gameover-modal');
    const settingsModal = document.getElementById('settings-modal');
    const highscoresModal = document.getElementById('highscores-modal');
    const howtoplayModal = document.getElementById('howtoplay-modal');

    // Main Menu Background Canvas Particle Effect
    const menuBgCanvas = document.getElementById('menu-bg-canvas');
    const menuBgCtx = menuBgCanvas.getContext('2d');
    let menuParticles = [];

    function initMenuBgCanvas() {
        menuBgCanvas.width = window.innerWidth;
        menuBgCanvas.height = window.innerHeight;
        menuParticles = [];
        for (let i = 0; i < 60; i++) {
            menuParticles.push({
                x: Math.random() * menuBgCanvas.width,
                y: Math.random() * menuBgCanvas.height,
                radius: Math.random() * 3 + 1,
                vx: (Math.random() - 0.5) * 20,
                vy: -Math.random() * 30 - 10,
                color: Math.random() > 0.4 ? 'rgba(255, 50, 50, 0.4)' : 'rgba(255, 150, 0, 0.3)'
            });
        }
    }
    initMenuBgCanvas();
    window.addEventListener('resize', initMenuBgCanvas);

    function updateMenuBgCanvas(dt) {
        if (!mainMenuScreen.classList.contains('active')) return;
        menuBgCtx.clearRect(0, 0, menuBgCanvas.width, menuBgCanvas.height);
        for (let i = 0; i < menuParticles.length; i++) {
            const p = menuParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.y < -10) {
                p.y = menuBgCanvas.height + 10;
                p.x = Math.random() * menuBgCanvas.width;
            }

            menuBgCtx.fillStyle = p.color;
            menuBgCtx.beginPath();
            menuBgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            menuBgCtx.fill();
        }
    }

    // Update Main Menu Stats Display
    function refreshMenuStats() {
        document.getElementById('menu-total-coins').textContent = storageManager.data.totalCoins;
        document.getElementById('menu-best-wave').textContent = storageManager.data.bestWave;
    }
    refreshMenuStats();

    // 2. Navigation & Button Click Listeners
    document.getElementById('btn-play').addEventListener('click', () => {
        audioManager.playMenuClick();
        audioManager.ensureContext();
        mainMenuScreen.classList.remove('active');
        gameContainerScreen.classList.add('active');
        game.startNewGame();
    });

    document.getElementById('btn-upgrades-menu').addEventListener('click', () => {
        audioManager.playMenuClick();
        openShopModal(true);
    });

    document.getElementById('btn-highscores').addEventListener('click', () => {
        audioManager.playMenuClick();
        renderHighScoresTable();
        highscoresModal.classList.remove('hidden');
    });

    document.getElementById('btn-howtoplay').addEventListener('click', () => {
        audioManager.playMenuClick();
        howtoplayModal.classList.remove('hidden');
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        audioManager.playMenuClick();
        loadSettingsForm();
        settingsModal.classList.remove('hidden');
    });

    // Close Modal Buttons
    document.getElementById('btn-close-settings').addEventListener('click', () => {
        audioManager.playMenuClick();
        saveSettingsForm();
        settingsModal.classList.add('hidden');
    });

    document.getElementById('btn-close-highscores').addEventListener('click', () => {
        audioManager.playMenuClick();
        highscoresModal.classList.add('hidden');
    });

    document.getElementById('btn-close-howtoplay').addEventListener('click', () => {
        audioManager.playMenuClick();
        howtoplayModal.classList.add('hidden');
    });

    // Pause Controls
    const togglePause = () => {
        if (game.state === 'PLAYING') {
            game.state = 'PAUSED';
            pauseModal.classList.remove('hidden');
        } else if (game.state === 'PAUSED') {
            game.state = 'PLAYING';
            pauseModal.classList.add('hidden');
        }
    };

    document.getElementById('btn-pause-hud').addEventListener('click', togglePause);
    document.getElementById('btn-resume').addEventListener('click', () => {
        audioManager.playMenuClick();
        game.state = 'PLAYING';
        pauseModal.classList.add('hidden');
    });

    document.getElementById('btn-pause-upgrades').addEventListener('click', () => {
        audioManager.playMenuClick();
        pauseModal.classList.add('hidden');
        openShopModal(false);
    });

    document.getElementById('btn-pause-settings').addEventListener('click', () => {
        audioManager.playMenuClick();
        loadSettingsForm();
        settingsModal.classList.remove('hidden');
    });

    document.getElementById('btn-exit-main-menu').addEventListener('click', () => {
        audioManager.playMenuClick();
        pauseModal.classList.add('hidden');
        gameoverModal.classList.add('hidden');
        upgradeModal.classList.add('hidden');
        game.state = 'MENU';
        game.audio.stopMusic();
        gameContainerScreen.classList.remove('active');
        mainMenuScreen.classList.add('active');
        refreshMenuStats();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        audioManager.playMenuClick();
        gameoverModal.classList.add('hidden');
        game.startNewGame();
    });

    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
        audioManager.playMenuClick();
        gameoverModal.classList.add('hidden');
        game.state = 'MENU';
        gameContainerScreen.classList.remove('active');
        mainMenuScreen.classList.add('active');
        refreshMenuStats();
    });

    document.getElementById('btn-start-next-wave').addEventListener('click', () => {
        audioManager.playMenuClick();
        upgradeModal.classList.add('hidden');
        if (game.state === 'SHOP') {
            game.state = 'PLAYING';
            game.waveManager.startWave(game.waveManager.currentWave + 1);
        }
    });

    // ESC Key Pause Hook
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            if (game.state === 'PLAYING' || game.state === 'PAUSED') {
                togglePause();
            }
        }
    });

    // 3. Shop & Upgrade Modal Rendering
    function openShopModal(isFromMenu = false) {
        renderShopTabs();
        upgradeModal.classList.remove('hidden');
        const nextWaveBtn = document.getElementById('btn-start-next-wave');
        if (isFromMenu) {
            nextWaveBtn.textContent = 'CLOSE STORE ✕';
            nextWaveBtn.onclick = () => {
                upgradeModal.classList.add('hidden');
                refreshMenuStats();
            };
        } else {
            nextWaveBtn.textContent = 'START NEXT WAVE ▶';
            nextWaveBtn.onclick = () => {
                upgradeModal.classList.add('hidden');
                if (game.state === 'SHOP') {
                    game.state = 'PLAYING';
                    game.waveManager.startWave(game.waveManager.currentWave + 1);
                }
            };
        }
    }

    // Inter-wave shop trigger hook from Game.js
    window.onWaveShopOpened = () => {
        openShopModal(false);
    };

    // Game over trigger hook from Game.js
    window.onGameOverTriggered = (stats) => {
        document.getElementById('go-nights').textContent = stats.nights;
        document.getElementById('go-waves').textContent = stats.waves;
        document.getElementById('go-kills').textContent = stats.kills;
        document.getElementById('go-coins').textContent = stats.coins;
        document.getElementById('go-score').textContent = stats.score.toLocaleString();

        const recordBadge = document.getElementById('go-new-highscore');
        if (stats.isNewHigh) recordBadge.classList.remove('hidden');
        else recordBadge.classList.add('hidden');

        gameoverModal.classList.remove('hidden');
    };

    // Shop Tab Switching
    const shopTabBtns = document.querySelectorAll('.shop-tab-btn');
    shopTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            audioManager.playMenuClick();
            shopTabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.shop-tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetTab = document.getElementById(btn.getAttribute('data-tab'));
            if (targetTab) targetTab.classList.add('active');
        });
    });

    function renderShopTabs() {
        document.getElementById('shop-coins').textContent = storageManager.data.totalCoins;

        // Render Tab 1: Attributes
        const upgradesContainer = document.getElementById('upgrades-container');
        upgradesContainer.innerHTML = '';

        Object.values(game.upgradeManager.upgrades).forEach(upg => {
            const currentLvl = storageManager.data.playerUpgrades[`${upg.id}Level`] || 0;
            const cost = game.upgradeManager.getUpgradeCost(upg.id);
            const isMax = currentLvl >= upg.maxLevel;

            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div class="card-title-row">
                    <span class="card-name">${upg.name}</span>
                    <span class="card-level">LVL ${currentLvl} / ${upg.maxLevel}</span>
                </div>
                <div class="card-desc">${upg.desc}</div>
                <div class="card-cost-row">
                    <span>${isMax ? '<strong style="color:#00ff88">MAXED</strong>' : `Cost: <strong>${cost}</strong> 🪙`}</span>
                    <button class="btn btn-primary btn-buy" ${isMax || storageManager.data.totalCoins < cost ? 'disabled style="opacity:0.4"' : ''}>
                        ${isMax ? 'MAX' : 'UPGRADE'}
                    </button>
                </div>
            `;

            const buyBtn = card.querySelector('.btn-buy');
            if (!isMax && storageManager.data.totalCoins >= cost) {
                buyBtn.addEventListener('click', () => {
                    if (game.upgradeManager.buyUpgrade(upg.id)) {
                        renderShopTabs();
                    }
                });
            }

            upgradesContainer.appendChild(card);
        });

        // Render Tab 2: Weapons Store
        const weaponsContainer = document.getElementById('weapons-container');
        weaponsContainer.innerHTML = '';

        Object.values(game.player.weaponManager.weapons).forEach(w => {
            const isUnlocked = w.unlocked;

            const card = document.createElement('div');
            card.className = 'weapon-card';
            card.innerHTML = `
                <div class="card-title-row">
                    <span class="card-name">${w.name}</span>
                    <span class="card-level">${isUnlocked ? '<strong style="color:#00ff88">UNLOCKED</strong>' : `Price: ${w.price} 🪙`}</span>
                </div>
                <div class="card-desc">Damage: ${w.damage} | Mag: ${w.magazineSize} | Reload: ${w.reloadTime}s</div>
                <div class="card-cost-row">
                    <span>${isUnlocked ? 'Ready to use' : `Requires ${w.price} coins`}</span>
                    <button class="btn btn-primary btn-buy" ${isUnlocked || storageManager.data.totalCoins < w.price ? 'disabled style="opacity:0.4"' : ''}>
                        ${isUnlocked ? 'EQUIPPED' : 'BUY WEAPON'}
                    </button>
                </div>
            `;

            const buyBtn = card.querySelector('.btn-buy');
            if (!isUnlocked && storageManager.data.totalCoins >= w.price) {
                buyBtn.addEventListener('click', () => {
                    if (game.upgradeManager.buyWeapon(w.id)) {
                        renderShopTabs();
                    }
                });
            }

            weaponsContainer.appendChild(card);
        });
    }

    // 4. High Scores Leaderboard
    function renderHighScoresTable() {
        const tbody = document.getElementById('highscores-list');
        tbody.innerHTML = '';

        const list = storageManager.data.highScoresList || [];
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No high scores recorded yet. Fight to survive!</td></tr>';
            return;
        }

        list.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${index + 1}</td>
                <td><strong style="color:#ff9900">${entry.score.toLocaleString()}</strong></td>
                <td>Wave ${entry.wave}</td>
                <td>${entry.kills}</td>
                <td>${entry.date}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // 5. Settings Form Binding
    function loadSettingsForm() {
        const s = storageManager.data.settings;
        document.getElementById('setting-sound').checked = s.sound;
        document.getElementById('setting-music').checked = s.music;
        document.getElementById('setting-volume').value = s.volume;
        document.getElementById('setting-screenshake').checked = s.screenshake;
        document.getElementById('setting-autoaim').checked = s.autoaim;
    }

    function saveSettingsForm() {
        const s = storageManager.data.settings;
        s.sound = document.getElementById('setting-sound').checked;
        s.music = document.getElementById('setting-music').checked;
        s.volume = parseInt(document.getElementById('setting-volume').value, 10);
        s.screenshake = document.getElementById('setting-screenshake').checked;
        s.autoaim = document.getElementById('setting-autoaim').checked;
        storageManager.save();
        audioManager.updateVolumes();
    }

    document.getElementById('btn-reset-data').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all save data and high scores?')) {
            storageManager.resetAllData();
            audioManager.updateVolumes();
            refreshMenuStats();
            settingsModal.classList.add('hidden');
        }
    });

    // 6. HUD Real-time Updates Binding
    function updateHUD() {
        if (game.state !== 'PLAYING' && game.state !== 'PAUSED') return;

        // Health
        const hpPct = (game.player.health / game.player.maxHealth) * 100;
        document.getElementById('hud-health-bar').style.width = `${hpPct}%`;
        document.getElementById('hud-health-text').textContent = `${Math.ceil(game.player.health)} / ${game.player.maxHealth}`;

        // Ammo & Active Weapon
        const w = game.player.weaponManager.currentWeapon;
        document.getElementById('hud-weapon-name').textContent = w.name.toUpperCase();
        document.getElementById('hud-ammo-current').textContent = w.currentAmmo;
        document.getElementById('hud-ammo-reserve').textContent = w.reserveAmmo;

        // Wave & Cycle
        document.getElementById('hud-wave-title').textContent = `WAVE ${game.waveManager.currentWave}`;
        document.getElementById('hud-cycle-display').textContent = game.waveManager.cyclePhase;

        const activeZombies = game.zombiePool.getActiveZombies();
        document.getElementById('hud-zombies-left').textContent = activeZombies.length + game.waveManager.zombiesToSpawn;

        // Coins & Score
        document.getElementById('hud-coins').textContent = game.player.coins;
        document.getElementById('hud-score').textContent = game.score.toLocaleString();

        // Reload Indicator
        const reloadInd = document.getElementById('hud-reload-indicator');
        if (w.isReloading) reloadInd.classList.remove('hidden');
        else reloadInd.classList.add('hidden');

        // Active Event Banner
        const eventBanner = document.getElementById('hud-event-banner');
        if (game.waveManager.activeEvent) {
            eventBanner.classList.remove('hidden');
            const eventTxt = document.getElementById('hud-event-text');
            if (game.waveManager.activeEvent === 'HORDE') eventTxt.textContent = '⚠️ HORDE INCOMING!';
            else if (game.waveManager.activeEvent === 'SUPPLY_DROP') eventTxt.textContent = '📦 SUPPLY DROP CRATE SPOTTED!';
            else if (game.waveManager.activeEvent === 'BLOOD_MOON') eventTxt.textContent = '🌕 BLOOD MOON - ZOMBIES ENRAGED!';
        } else {
            eventBanner.classList.add('hidden');
        }

        // Boss Health Bar
        const bossBarContainer = document.getElementById('hud-boss-bar-container');
        const bossZombie = game.zombiePool.getBossZombie();
        if (bossZombie) {
            bossBarContainer.classList.remove('hidden');
            document.getElementById('hud-boss-name').textContent = bossZombie.name;
            const bossPct = (bossZombie.health / bossZombie.maxHealth) * 100;
            document.getElementById('hud-boss-health-bar').style.width = `${bossPct}%`;
        } else {
            bossBarContainer.classList.add('hidden');
        }

        // Quick Weapon Slot Selection Highlights
        const slots = document.querySelectorAll('#hud-weapon-slots .weapon-slot');
        const wIds = ['pistol', 'shotgun', 'smg', 'rifle'];
        slots.forEach((slot, idx) => {
            const id = wIds[idx];
            const weaponObj = game.player.weaponManager.weapons[id];
            if (weaponObj.unlocked) slot.classList.remove('locked');
            else slot.classList.add('locked');

            if (game.player.weaponManager.currentWeaponId === id) slot.classList.add('active');
            else slot.classList.remove('active');
        });
    }

    // Quick Slot Click Listeners
    document.querySelectorAll('#hud-weapon-slots .weapon-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const idx = parseInt(slot.getAttribute('data-slot'), 10);
            const wIds = ['pistol', 'shotgun', 'smg', 'rifle'];
            game.player.weaponManager.switchWeapon(wIds[idx]);
        });
    });

    // 7. Main Game RAF Loop
    let lastFrameTime = performance.now();
    function gameLoop(now) {
        const dt = Math.min(0.1, (now - lastFrameTime) / 1000); // Clamp delta time to 100ms
        lastFrameTime = now;

        updateMenuBgCanvas(dt);

        if (game.state === 'PLAYING') {
            game.update(dt);
            game.render();
            updateHUD();
        }

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
