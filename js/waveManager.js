/* ==========================================================================
   WAVE MANAGER & DAY/NIGHT CYCLE
   Wave Scaling, Dynamic Spawner, Day/Night Lighting Timer & Special Events
   ========================================================================== */

class WaveManager {
    constructor(zombiePool) {
        this.zombiePool = zombiePool;

        this.currentWave = 1;
        this.zombiesToSpawn = 10;
        this.zombiesRemaining = 10;
        this.spawnTimer = 0;
        this.spawnInterval = 1.8; // Seconds between spawns

        this.isWaveActive = false;
        this.waveClearedBreak = false;
        this.breakTimer = 0;

        // Day/Night Cycle State
        this.cycleTime = 0;
        this.cycleDuration = 90; // Total seconds per full day/night cycle
        this.cyclePhase = 'DAY'; // DAY, EVENING, NIGHT, DAWN
        this.darknessAlpha = 0; // 0.0 = bright day, 0.85 = pitch night

        // Special Events
        this.activeEvent = null; // 'HORDE', 'SUPPLY_DROP', 'BLOOD_MOON'
        this.eventTimer = 0;
    }

    startRun() {
        this.currentWave = 1;
        this.cycleTime = 0;
        this.startWave(1);
    }

    startWave(waveNumber) {
        this.currentWave = waveNumber;
        this.isWaveActive = true;
        this.waveClearedBreak = false;

        // Formula for zombie count scaling
        this.zombiesToSpawn = 10 + (waveNumber - 1) * 6;
        this.zombiesRemaining = this.zombiesToSpawn;
        this.spawnInterval = Math.max(0.4, 1.8 - (waveNumber * 0.08));

        // Trigger Boss on wave multiples of 5
        if (waveNumber % 5 === 0) {
            this.zombiesToSpawn += 1; // Boss + adds
        }

        // Random Special Event Chance (25% chance starting wave 3)
        this.activeEvent = null;
        if (waveNumber >= 3 && Math.random() < 0.3) {
            const events = ['HORDE', 'SUPPLY_DROP', 'BLOOD_MOON'];
            this.activeEvent = events[Math.floor(Math.random() * events.length)];
            this.eventTimer = 15.0; // Event lasts 15 seconds
        }
    }

    update(dt, player, camera, worldWidth, worldHeight, onWaveCleared, onEventTriggered) {
        // 1. Day / Night Cycle Update
        this.cycleTime = (this.cycleTime + dt) % this.cycleDuration;
        const progress = this.cycleTime / this.cycleDuration;

        if (progress < 0.30) {
            // DAYTIME (0 - 30%)
            this.cyclePhase = '☀️ DAY';
            this.darknessAlpha = 0;
        } else if (progress < 0.45) {
            // EVENING (30 - 45%)
            this.cyclePhase = '🌆 EVENING';
            const t = (progress - 0.30) / 0.15;
            this.darknessAlpha = t * 0.7;
        } else if (progress < 0.80) {
            // NIGHT (45 - 80%)
            this.cyclePhase = '🌙 NIGHT';
            this.darknessAlpha = 0.85;
        } else {
            // DAWN (80 - 100%)
            this.cyclePhase = '🌅 DAWN';
            const t = (progress - 0.80) / 0.20;
            this.darknessAlpha = 0.85 * (1 - t);
        }

        // Blood Moon Event Override
        if (this.activeEvent === 'BLOOD_MOON') {
            this.darknessAlpha = Math.max(this.darknessAlpha, 0.75);
        }

        // 2. Event Timer
        if (this.activeEvent) {
            this.eventTimer -= dt;
            if (this.eventTimer <= 0) {
                this.activeEvent = null;
            }
        }

        // 3. Wave Spawn Loop
        if (this.isWaveActive && this.zombiesToSpawn > 0) {
            this.spawnTimer += dt;
            
            // Spawn faster at night or during horde event
            let currentSpawnRate = this.spawnInterval;
            if (this.cyclePhase === '🌙 NIGHT') currentSpawnRate *= 0.6;
            if (this.activeEvent === 'HORDE') currentSpawnRate *= 0.3;

            if (this.spawnTimer >= currentSpawnRate) {
                this.spawnTimer = 0;
                this.spawnZombieNearPlayer(player, camera, worldWidth, worldHeight);
            }
        }

        // 4. Check Wave Completion
        const activeZombies = this.zombiePool.getActiveZombies();
        if (this.isWaveActive && this.zombiesToSpawn <= 0 && activeZombies.length === 0) {
            this.isWaveActive = false;
            this.waveClearedBreak = true;

            const bonusCoins = 50 + this.currentWave * 25;
            player.coins += bonusCoins;

            if (onWaveCleared) {
                onWaveCleared(this.currentWave, bonusCoins);
            }
        }
    }

    spawnZombieNearPlayer(player, camera, worldWidth, worldHeight) {
        if (this.zombiesToSpawn <= 0) return;

        // Choose Zombie Type based on Wave Number
        let type = 'normal';
        const rand = Math.random();
        const wave = this.currentWave;

        if (wave % 5 === 0 && this.zombiesToSpawn === 1) {
            type = 'boss';
        } else if (wave >= 5 && rand < 0.25) {
            type = 'tank';
        } else if (wave >= 3 && rand < 0.55) {
            type = 'fast';
        }

        // Spawn outside visible camera view (margin of 80px)
        const margin = 100;
        let spawnX, spawnY;
        const side = Math.floor(Math.random() * 4); // 0=Top, 1=Right, 2=Bottom, 3=Left

        if (side === 0) { // Top
            spawnX = camera.x + Math.random() * camera.width;
            spawnY = camera.y - margin;
        } else if (side === 1) { // Right
            spawnX = camera.x + camera.width + margin;
            spawnY = camera.y + Math.random() * camera.height;
        } else if (side === 2) { // Bottom
            spawnX = camera.x + Math.random() * camera.width;
            spawnY = camera.y + camera.height + margin;
        } else { // Left
            spawnX = camera.x - margin;
            spawnY = camera.y + Math.random() * camera.height;
        }

        // Clamp spawn coordinates within world bounds
        spawnX = Math.max(30, Math.min(worldWidth - 30, spawnX));
        spawnY = Math.max(30, Math.min(worldHeight - 30, spawnY));

        const waveMult = 1.0 + (wave - 1) * 0.12;
        const z = this.zombiePool.spawn(type, spawnX, spawnY, waveMult);
        if (z) {
            this.zombiesToSpawn--;
        }
    }
}
