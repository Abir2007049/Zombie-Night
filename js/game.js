/* ==========================================================================
   GAME ENGINE & MAP RENDERER
   Canvas Game Loop, Camera Lerp, Procedural Map & 2D Darkness Lighting System
   ========================================================================== */

class Game {
    constructor(storageManager, audioManager, inputManager, mobileController) {
        this.storage = storageManager;
        this.audio = audioManager;
        this.input = inputManager;
        this.mobile = mobileController;

        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // World Bounds
        this.worldWidth = 3200;
        this.worldHeight = 3200;

        // Camera
        this.camera = {
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight
        };

        // State Machine: 'MENU', 'PLAYING', 'SHOP', 'PAUSED', 'GAME_OVER'
        this.state = 'MENU';

        // Game Entities & Systems
        this.player = new Player(this.worldWidth / 2, this.worldHeight / 2);
        this.zombiePool = new ZombiePool();
        this.bulletPool = new BulletPool();
        this.particleSystem = new ParticleSystem();
        this.waveManager = new WaveManager(this.zombiePool);
        this.upgradeManager = new UpgradeManager(this.player, this.storage, this.audio);

        // Map Obstacles (Buildings, Cars, Fences, Streetlights)
        this.obstacles = [];
        this.streetLights = [];
        this.pickups = []; // { x, y, type: 'health'|'ammo'|'coin', radius, value, active }

        // Gameplay Metrics
        this.score = 0;
        this.kills = 0;
        this.coinsEarnedInRun = 0;
        this.runTime = 0;

        // Loop Timers
        this.lastTime = performance.now();
        this.initMap();
        this.handleResize();

        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.width = window.innerWidth;
        this.camera.height = window.innerHeight;
    }

    initMap() {
        this.obstacles = [];
        this.streetLights = [];

        // 1. Buildings (Solid Blocks)
        const buildingLayouts = [
            { x: 400, y: 400, w: 320, h: 240, label: 'STORE' },
            { x: 900, y: 350, w: 400, h: 300, label: 'BANK' },
            { x: 1800, y: 400, w: 350, h: 250, label: 'POLICE' },
            { x: 2400, y: 500, w: 420, h: 320, label: 'HOSPITAL' },

            { x: 350, y: 1400, w: 380, h: 280, label: 'DANGER' },
            { x: 2300, y: 1300, w: 400, h: 300, label: 'MOTEL' },

            { x: 500, y: 2200, w: 450, h: 300, label: 'WAREHOUSE' },
            { x: 1600, y: 2300, w: 360, h: 260, label: 'GAS STATION' },
            { x: 2200, y: 2200, w: 400, h: 350, label: 'ARMORY' }
        ];

        buildingLayouts.forEach(b => {
            this.obstacles.push({
                x: b.x,
                y: b.y,
                w: b.w,
                h: b.h,
                type: 'building',
                label: b.label
            });
        });

        // 2. Abandoned Cars
        const carPositions = [
            { x: 800, y: 850, w: 70, h: 120, color: '#aa2222' },
            { x: 1400, y: 900, w: 120, h: 70, color: '#2255aa' },
            { x: 1550, y: 1700, w: 70, h: 120, color: '#333333' },
            { x: 2100, y: 1100, w: 120, h: 70, color: '#888822' },
            { x: 1200, y: 2000, w: 70, h: 120, color: '#662288' }
        ];

        carPositions.forEach(c => {
            this.obstacles.push({
                x: c.x,
                y: c.y,
                w: c.w,
                h: c.h,
                type: 'car',
                color: c.color
            });
        });

        // 3. Street Lights (Casts light pools)
        const lightCoords = [
            { x: 750, y: 750 }, { x: 1500, y: 750 }, { x: 2250, y: 750 },
            { x: 750, y: 1500 }, { x: 1600, y: 1500 }, { x: 2250, y: 1500 },
            { x: 750, y: 2250 }, { x: 1500, y: 2250 }, { x: 2250, y: 2250 }
        ];

        lightCoords.forEach(l => {
            this.streetLights.push({ x: l.x, y: l.y, radius: 180 });
        });
    }

    startNewGame() {
        this.player.reset(this.worldWidth / 2, this.worldHeight / 2);
        this.upgradeManager.applySavedUpgrades();
        this.zombiePool = new ZombiePool();
        this.bulletPool = new BulletPool();
        this.pickups = [];
        this.score = 0;
        this.kills = 0;
        this.coinsEarnedInRun = 0;
        this.runTime = 0;

        this.waveManager.zombiePool = this.zombiePool;
        this.waveManager.startRun();
        this.state = 'PLAYING';
        this.audio.startMusic();
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        this.runTime += dt;

        // 1. Update Camera (Smooth lerp follow)
        const targetCamX = this.player.x - this.camera.width / 2;
        const targetCamY = this.player.y - this.camera.height / 2;
        this.camera.x += (targetCamX - this.camera.x) * 0.1;
        this.camera.y += (targetCamY - this.camera.y) * 0.1;

        // Clamp camera to world boundary
        this.camera.x = Math.max(0, Math.min(this.worldWidth - this.camera.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.worldHeight - this.camera.height, this.camera.y));

        this.input.updateWorldMouse(this.camera.x, this.camera.y);

        // 2. Player Input & Shooting
        this.player.update(dt, this.input, this.mobile, this.camera, this.worldWidth, this.worldHeight, this.obstacles, this.audio, this.particleSystem);

        const activeWeapon = this.player.weaponManager.currentWeapon;
        const wantsShoot = this.input.mouse.isDown || this.mobile.isShooting;
        if (wantsShoot) {
            activeWeapon.shoot(this.player.x, this.player.y, this.player.angle, this.bulletPool, this.particleSystem, this.audio, this.player);
        }

        // 3. Bullet Physics & Collisions
        const activeZombies = this.zombiePool.getActiveZombies();
        this.bulletPool.update(dt, this.worldWidth, this.worldHeight, this.obstacles, activeZombies, this.particleSystem, this.audio, (zombie) => {
            // Zombie Killed Callback
            this.kills++;
            this.score += zombie.reward * 10;
            const earnedCoins = Math.round(zombie.reward * (this.waveManager.activeEvent === 'BLOOD_MOON' ? 2.0 : 1.0));
            this.coinsEarnedInRun += earnedCoins;
            this.player.coins += earnedCoins;

            // 25% Chance to spawn a pickup on death
            if (Math.random() < 0.25) {
                const types = ['coin', 'coin', 'ammo', 'health'];
                const pType = types[Math.floor(Math.random() * types.length)];
                this.pickups.push({
                    x: zombie.x,
                    y: zombie.y,
                    type: pType,
                    radius: 12,
                    value: pType === 'coin' ? 15 : (pType === 'health' ? 30 : 25),
                    active: true
                });
            }
        });

        // 4. Update Zombies AI
        for (let i = 0; i < activeZombies.length; i++) {
            activeZombies[i].update(dt, this.player, activeZombies, this.obstacles, this.particleSystem, this.audio, (damage) => {
                // Player attacked callback
                const died = this.player.takeDamage(damage, this.particleSystem, this.audio);
                if (died) {
                    this.triggerGameOver();
                }
            });
        }

        // 5. Update Pickups Magnet & Collection
        for (let i = 0; i < this.pickups.length; i++) {
            const p = this.pickups[i];
            if (!p.active) continue;

            const dx = this.player.x - p.x;
            const dy = this.player.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Magnet pull towards player
            if (dist < this.player.magnetRadius) {
                p.x += (dx / dist) * 260 * dt;
                p.y += (dy / dist) * 260 * dt;
            }

            // Collection Check
            if (dist < this.player.radius + p.radius) {
                p.active = false;
                if (p.type === 'coin') {
                    this.player.coins += p.value;
                    this.coinsEarnedInRun += p.value;
                    this.audio.playCoinPickup();
                } else if (p.type === 'health') {
                    this.player.heal(p.value);
                    this.audio.playCoinPickup();
                } else if (p.type === 'ammo') {
                    this.player.weaponManager.currentWeapon.addAmmo(p.value);
                    this.audio.playReload();
                }
            }
        }
        this.pickups = this.pickups.filter(p => p.active);

        // 6. Wave Manager Logic
        this.waveManager.update(dt, this.player, this.camera, this.worldWidth, this.worldHeight, (completedWave, bonusCoins) => {
            // Wave Cleared Callback
            this.audio.playWaveClear();
            this.coinsEarnedInRun += bonusCoins;
            this.score += completedWave * 500;
            this.triggerWaveShop();
        });

        // 7. Update Particles
        this.particleSystem.update(dt);
    }

    triggerWaveShop() {
        this.state = 'SHOP';
        if (window.onWaveShopOpened) window.onWaveShopOpened();
    }

    triggerGameOver() {
        this.state = 'GAME_OVER';
        this.audio.stopMusic();

        const isNewHigh = this.storage.saveRunResults(
            this.score,
            this.waveManager.currentWave,
            this.kills,
            this.coinsEarnedInRun
        );

        if (window.onGameOverTriggered) {
            window.onGameOverTriggered({
                nights: Math.floor(this.waveManager.currentWave / 2),
                waves: this.waveManager.currentWave,
                kills: this.kills,
                coins: this.coinsEarnedInRun,
                score: this.score,
                isNewHigh: isNewHigh
            });
        }
    }

    render() {
        const ctx = this.ctx;
        const cam = this.camera;

        // Apply Screen Shake Offset
        ctx.save();
        ctx.translate(this.particleSystem.shakeOffsetX, this.particleSystem.shakeOffsetY);

        // 1. Clear Screen
        ctx.fillStyle = '#10141d';
        ctx.fillRect(0, 0, cam.width, cam.height);

        // 2. Render Map Floor Grid & Roads
        this.renderMapFloor(ctx, cam);

        // 3. Render Permanent Decals (Blood ground splatters)
        this.particleSystem.renderDecals(ctx, cam);

        // 4. Render Pickups
        this.renderPickups(ctx, cam);

        // 5. Render Obstacles & Vehicles
        this.renderObstacles(ctx, cam);

        // 6. Render Zombies
        const activeZombies = this.zombiePool.getActiveZombies();
        for (let i = 0; i < activeZombies.length; i++) {
            activeZombies[i].render(ctx, cam);
        }

        // 7. Render Player
        if (this.player.health > 0) {
            this.player.render(ctx, cam);
        }

        // 8. Render Bullets
        this.bulletPool.render(ctx, cam);

        // 9. Render Particles (Sparks, Damage Numbers, Muzzle flashes)
        this.particleSystem.renderParticles(ctx, cam);

        // 10. Render Day/Night Darkness Lighting System
        this.renderDarknessOverlay(ctx, cam);

        ctx.restore();
    }

    renderMapFloor(ctx, cam) {
        const tileSize = 120;
        const startX = Math.floor(cam.x / tileSize) * tileSize;
        const startY = Math.floor(cam.y / tileSize) * tileSize;
        const endX = cam.x + cam.width + tileSize;
        const endY = cam.y + cam.height + tileSize;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;

        for (let x = startX; x < endX; x += tileSize) {
            for (let y = startY; y < endY; y += tileSize) {
                const screenX = x - cam.x;
                const screenY = y - cam.y;

                ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? '#141822' : '#11151e';
                ctx.fillRect(screenX, screenY, tileSize, tileSize);
                ctx.strokeRect(screenX, screenY, tileSize, tileSize);
            }
        }

        // Render Road Crossings
        ctx.fillStyle = '#0c0f16';
        const roadW = 180;
        // Main Horizontal Road
        const roadY = this.worldHeight / 2 - roadW / 2 - cam.y;
        ctx.fillRect(0 - cam.x, roadY, this.worldWidth, roadW);

        // Main Vertical Road
        const roadX = this.worldWidth / 2 - roadW / 2 - cam.x;
        ctx.fillRect(roadX, 0 - cam.y, roadW, this.worldHeight);
    }

    renderObstacles(ctx, cam) {
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            const screenX = obs.x - cam.x;
            const screenY = obs.y - cam.y;

            // Frustum cull
            if (screenX + obs.w < 0 || screenX > cam.width || screenY + obs.h < 0 || screenY > cam.height) continue;

            if (obs.type === 'building') {
                // Building Wall Base
                ctx.fillStyle = '#1c2333';
                ctx.fillRect(screenX, screenY, obs.w, obs.h);
                ctx.strokeStyle = 'rgba(255, 75, 75, 0.4)';
                ctx.lineWidth = 3;
                ctx.strokeRect(screenX, screenY, obs.w, obs.h);

                // Building Roof Label
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.font = "bold 16px 'Orbitron', sans-serif";
                ctx.textAlign = 'center';
                ctx.fillText(obs.label, screenX + obs.w / 2, screenY + obs.h / 2);
            } else if (obs.type === 'car') {
                // Abandoned Vehicle
                ctx.fillStyle = obs.color;
                ctx.fillRect(screenX, screenY, obs.w, obs.h);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, screenY, obs.w, obs.h);

                // Windshield
                ctx.fillStyle = '#111';
                ctx.fillRect(screenX + 4, screenY + 4, obs.w - 8, Math.min(obs.h, 20));
            }
        }
    }

    renderPickups(ctx, cam) {
        for (let i = 0; i < this.pickups.length; i++) {
            const p = this.pickups[i];
            const screenX = p.x - cam.x;
            const screenY = p.y - cam.y;

            if (screenX < -20 || screenX > cam.width + 20 || screenY < -20 || screenY > cam.height + 20) continue;

            ctx.save();
            ctx.translate(screenX, screenY);

            // Floating animation pulse
            const bounce = Math.sin(Date.now() / 200) * 3;

            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';

            if (p.type === 'coin') {
                ctx.fillText('🪙', 0, bounce);
            } else if (p.type === 'health') {
                ctx.fillText('❤️', 0, bounce);
            } else if (p.type === 'ammo') {
                ctx.fillText('🔫', 0, bounce);
            }

            ctx.restore();
        }
    }

    // 2D Canvas Darkness Overlay & Illumination Cone
    renderDarknessOverlay(ctx, cam) {
        const alpha = this.waveManager.darknessAlpha;
        if (alpha <= 0.02) return; // Full daylight

        // Offscreen darkness buffer blending
        ctx.save();
        ctx.fillStyle = this.waveManager.activeEvent === 'BLOOD_MOON'
            ? `rgba(40, 0, 10, ${alpha})`
            : `rgba(4, 6, 12, ${alpha})`;
        ctx.fillRect(0, 0, cam.width, cam.height);

        // Cut out light source illumination (Player flashlight & Streetlights)
        ctx.globalCompositeOperation = 'destination-out';

        // 1. Cut out Flashlight Cone
        if (this.player.health > 0) {
            this.player.renderFlashlight(ctx, cam, alpha);
        }

        // 2. Cut out Street Light Pools
        for (let i = 0; i < this.streetLights.length; i++) {
            const sl = this.streetLights[i];
            const screenX = sl.x - cam.x;
            const screenY = sl.y - cam.y;

            if (screenX < -200 || screenX > cam.width + 200 || screenY < -200 || screenY > cam.height + 200) continue;

            const grad = ctx.createRadialGradient(screenX, screenY, 10, screenX, screenY, sl.radius);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(screenX, screenY, sl.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
