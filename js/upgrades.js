/* ==========================================================================
   UPGRADE MANAGER
   Player Attribute Upgrades & Weapon Purchasing Shop Engine
   ========================================================================== */

class UpgradeManager {
    constructor(player, storageManager, audioManager) {
        this.player = player;
        this.storage = storageManager;
        this.audio = audioManager;

        this.upgrades = {
            health: {
                id: 'health',
                name: '❤️ MAX HEALTH',
                desc: 'Increase maximum player health (+25 HP)',
                baseCost: 100,
                costScale: 1.5,
                maxLevel: 5
            },
            speed: {
                id: 'speed',
                name: '⚡ MOVEMENT SPEED',
                desc: 'Move faster across the battlefield (+15 Speed)',
                baseCost: 80,
                costScale: 1.4,
                maxLevel: 5
            },
            damage: {
                id: 'damage',
                name: '🔫 DAMAGE OUTPUT',
                desc: 'Increase weapon damage (+15% per level)',
                baseCost: 150,
                costScale: 1.6,
                maxLevel: 5
            },
            fireRate: {
                id: 'fireRate',
                name: '🎯 FIRE RATE',
                desc: 'Shoot faster with all weapons (+12% Fire Rate)',
                baseCost: 180,
                costScale: 1.6,
                maxLevel: 5
            },
            magnet: {
                id: 'magnet',
                name: '🧲 COIN MAGNET',
                desc: 'Attract coins and pickups from further away (+40px)',
                baseCost: 90,
                costScale: 1.4,
                maxLevel: 5
            },
            dash: {
                id: 'dash',
                name: '💨 DASH COOLDOWN',
                desc: 'Reduce dash cooldown time (-0.35s)',
                baseCost: 120,
                costScale: 1.5,
                maxLevel: 3
            }
        };

        this.applySavedUpgrades();
    }

    applySavedUpgrades() {
        const pLevels = this.storage.data.playerUpgrades;

        // Health
        const hLvl = pLevels.healthLevel || 0;
        this.player.maxHealth = 100 + hLvl * 25;
        this.player.health = Math.min(this.player.health, this.player.maxHealth);

        // Speed
        const sLvl = pLevels.speedLevel || 0;
        this.player.speed = this.player.baseSpeed + sLvl * 15;

        // Damage
        const dLvl = pLevels.damageLevel || 0;
        this.player.damageMultiplier = 1.0 + dLvl * 0.15;

        // Fire Rate
        const fLvl = pLevels.fireRateLevel || 0;
        this.player.fireRateMultiplier = Math.max(0.4, 1.0 - fLvl * 0.10);

        // Magnet
        const mLvl = pLevels.magnetLevel || 0;
        this.player.magnetRadius = 90 + mLvl * 45;

        // Dash
        const dashLvl = pLevels.dashLevel || 0;
        this.player.dashCooldown = Math.max(0.8, 2.0 - dashLvl * 0.35);

        // Weapon Unlocks
        const unlocked = this.storage.data.unlockedWeapons || ['pistol'];
        Object.keys(this.player.weaponManager.weapons).forEach(wId => {
            this.player.weaponManager.weapons[wId].unlocked = unlocked.includes(wId);
        });
    }

    getUpgradeCost(upgradeId) {
        const upg = this.upgrades[upgradeId];
        const lvlKey = `${upgradeId}Level`;
        const currentLvl = this.storage.data.playerUpgrades[lvlKey] || 0;
        if (currentLvl >= upg.maxLevel) return null; // Maxed out

        return Math.floor(upg.baseCost * Math.pow(upg.costScale, currentLvl));
    }

    buyUpgrade(upgradeId) {
        const cost = this.getUpgradeCost(upgradeId);
        if (cost === null) return false;

        if (this.storage.spendCoins(cost)) {
            const lvlKey = `${upgradeId}Level`;
            this.storage.data.playerUpgrades[lvlKey] = (this.storage.data.playerUpgrades[lvlKey] || 0) + 1;
            this.storage.save();
            this.applySavedUpgrades();
            if (this.audio) this.audio.playCoinPickup();
            return true;
        }
        return false;
    }

    buyWeapon(weaponId) {
        const weapon = this.player.weaponManager.weapons[weaponId];
        if (!weapon || weapon.unlocked) return false;

        if (this.storage.spendCoins(weapon.price)) {
            weapon.unlocked = true;
            if (!this.storage.data.unlockedWeapons.includes(weaponId)) {
                this.storage.data.unlockedWeapons.push(weaponId);
            }
            this.storage.save();
            this.player.weaponManager.switchWeapon(weaponId);
            if (this.audio) this.audio.playCoinPickup();
            return true;
        }
        return false;
    }
}
