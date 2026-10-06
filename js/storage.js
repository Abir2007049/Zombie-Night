/* ==========================================================================
   STORAGE MANAGER
   Local Storage Persistence for High Scores, Coins, Upgrades, & Settings
   ========================================================================== */

class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'zombie_night_save_v1';
        this.data = this.load();
    }

    getDefaultData() {
        return {
            highScore: 0,
            highScoresList: [], // Array of { score, wave, kills, date }
            totalCoins: 0,
            bestWave: 0,
            unlockedWeapons: ['pistol'], // pistol unlocked by default
            weaponUpgrades: {
                pistol: { dmgLevel: 0, reloadLevel: 0 },
                shotgun: { dmgLevel: 0, reloadLevel: 0 },
                smg: { dmgLevel: 0, reloadLevel: 0 },
                rifle: { dmgLevel: 0, reloadLevel: 0 }
            },
            playerUpgrades: {
                healthLevel: 0,
                speedLevel: 0,
                damageLevel: 0,
                fireRateLevel: 0,
                magnetLevel: 0,
                dashLevel: 0
            },
            settings: {
                sound: true,
                music: true,
                volume: 80,
                screenshake: true,
                autoaim: true
            }
        };
    }

    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return this.getDefaultData();
            const parsed = JSON.parse(raw);
            // Merge defaults to handle missing keys from updates
            return { ...this.getDefaultData(), ...parsed };
        } catch (e) {
            console.warn('Failed to load save data from localStorage, using defaults.', e);
            return this.getDefaultData();
        }
    }

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save data to localStorage.', e);
        }
    }

    addCoins(amount) {
        this.data.totalCoins += Math.max(0, amount);
        this.save();
    }

    spendCoins(amount) {
        if (this.data.totalCoins >= amount) {
            this.data.totalCoins -= amount;
            this.save();
            return true;
        }
        return false;
    }

    saveRunResults(score, wave, kills, coinsEarned) {
        this.addCoins(coinsEarned);

        if (wave > this.data.bestWave) {
            this.data.bestWave = wave;
        }

        let isNewHigh = false;
        if (score > this.data.highScore) {
            this.data.highScore = score;
            isNewHigh = true;
        }

        // Add to High Score Leaderboard
        const newEntry = {
            score: score,
            wave: wave,
            kills: kills,
            date: new Date().toLocaleDateString()
        };

        this.data.highScoresList.push(newEntry);
        this.data.highScoresList.sort((a, b) => b.score - a.score);
        if (this.data.highScoresList.length > 10) {
            this.data.highScoresList = this.data.highScoresList.slice(0, 10);
        }

        this.save();
        return isNewHigh;
    }

    resetAllData() {
        this.data = this.getDefaultData();
        this.save();
    }
}
