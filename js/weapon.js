/* ==========================================================================
   WEAPON SYSTEM
   Arsenal Specs, Reload Timers, Firing Mechanics & Recoil Spread
   ========================================================================== */

class Weapon {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.damage = config.damage;
        this.fireRate = config.fireRate; // Delay between shots in seconds
        this.magazineSize = config.magazineSize;
        this.currentAmmo = config.magazineSize;
        this.reserveAmmo = config.reserveAmmo;
        this.maxReserve = config.maxReserve;
        this.reloadTime = config.reloadTime; // Reload duration in seconds
        this.spread = config.spread; // Spread angle in radians
        this.pellets = config.pellets || 1; // Pellets per shot (shotgun)
        this.speed = config.speed || 1200;
        this.penetration = config.penetration || 1;
        this.unlocked = config.unlocked || false;
        this.price = config.price || 0;

        // State trackers
        this.cooldownTimer = 0;
        this.isReloading = false;
        this.reloadTimer = 0;
    }

    update(dt) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }

        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.completeReload();
            }
        }
    }

    canShoot() {
        return !this.isReloading && this.cooldownTimer <= 0 && this.currentAmmo > 0;
    }

    shoot(x, y, angle, bulletPool, particleSystem, audioManager, playerStats) {
        if (!this.canShoot()) {
            if (this.currentAmmo === 0 && !this.isReloading) {
                this.startReload(audioManager);
            }
            return false;
        }

        this.currentAmmo--;
        this.cooldownTimer = this.fireRate * playerStats.fireRateMultiplier;

        // Trigger Audio SFX
        if (this.id === 'pistol') audioManager.playPistol();
        else if (this.id === 'shotgun') audioManager.playShotgun();
        else if (this.id === 'smg') audioManager.playSMG();
        else if (this.id === 'rifle') audioManager.playRifle();

        // Muzzle flash particle
        const muzzleX = x + Math.cos(angle) * 28;
        const muzzleY = y + Math.sin(angle) * 28;
        particleSystem.spawnMuzzleFlash(muzzleX, muzzleY, angle);

        // Calculate Damage with Player Multiplier & Crit Chance
        const finalDamage = this.damage * playerStats.damageMultiplier;
        const isCrit = Math.random() < playerStats.critChance;

        // Spawn Bullets (Multiple if shotgun)
        for (let i = 0; i < this.pellets; i++) {
            const spreadOffset = (Math.random() - 0.5) * this.spread;
            const bulletAngle = angle + spreadOffset;

            bulletPool.spawn({
                x: muzzleX,
                y: muzzleY,
                angle: bulletAngle,
                speed: this.speed,
                damage: isCrit ? finalDamage * 2.0 : finalDamage,
                penetration: this.penetration,
                isCritical: isCrit,
                color: isCrit ? '#ff3300' : (this.id === 'smg' ? '#ffff55' : '#ffffaa'),
                radius: this.id === 'shotgun' ? 2.5 : 3.5
            });
        }

        return true;
    }

    startReload(audioManager) {
        if (this.isReloading) return;
        if (this.currentAmmo >= this.magazineSize) return;
        if (this.reserveAmmo <= 0) return;

        this.isReloading = true;
        this.reloadTimer = this.reloadTime;
        if (audioManager) audioManager.playReload();
    }

    completeReload() {
        const needed = this.magazineSize - this.currentAmmo;
        const add = Math.min(needed, this.reserveAmmo);
        this.currentAmmo += add;
        this.reserveAmmo -= add;
        this.isReloading = false;
        this.reloadTimer = 0;
    }

    addAmmo(amount) {
        this.reserveAmmo = Math.min(this.maxReserve, this.reserveAmmo + amount);
    }
}

class WeaponManager {
    constructor() {
        this.weapons = {
            pistol: new Weapon({
                id: 'pistol',
                name: 'Pistol',
                damage: 22,
                fireRate: 0.25,
                magazineSize: 12,
                reserveAmmo: 120,
                maxReserve: 240,
                reloadTime: 1.2,
                spread: 0.08,
                pellets: 1,
                unlocked: true,
                price: 0
            }),
            shotgun: new Weapon({
                id: 'shotgun',
                name: 'Shotgun',
                damage: 16, // Per pellet x 6 = 96 total burst damage!
                fireRate: 0.75,
                magazineSize: 6,
                reserveAmmo: 36,
                maxReserve: 96,
                reloadTime: 2.0,
                spread: 0.32,
                pellets: 6,
                unlocked: false,
                price: 350
            }),
            smg: new Weapon({
                id: 'smg',
                name: 'SMG',
                damage: 14,
                fireRate: 0.09,
                magazineSize: 30,
                reserveAmmo: 180,
                maxReserve: 360,
                reloadTime: 1.4,
                spread: 0.16,
                pellets: 1,
                unlocked: false,
                price: 500
            }),
            rifle: new Weapon({
                id: 'rifle',
                name: 'Assault Rifle',
                damage: 48,
                fireRate: 0.16,
                magazineSize: 20,
                reserveAmmo: 120,
                maxReserve: 240,
                reloadTime: 1.6,
                spread: 0.05,
                pellets: 1,
                penetration: 2,
                unlocked: false,
                price: 800
            })
        };

        this.currentWeaponId = 'pistol';
    }

    get currentWeapon() {
        return this.weapons[this.currentWeaponId];
    }

    switchWeapon(id) {
        if (this.weapons[id] && this.weapons[id].unlocked) {
            this.currentWeaponId = id;
            return true;
        }
        return false;
    }

    update(dt) {
        Object.values(this.weapons).forEach(w => w.update(dt));
    }
}
