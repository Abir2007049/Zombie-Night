/* ==========================================================================
   PLAYER CHARACTER
   Player Physics, Top-Down Canvas Sprite, Flashlight System & Dash Logic
   ========================================================================== */

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18;
        this.angle = 0; // Angle facing cursor or movement direction

        // Base Attributes
        this.maxHealth = 100;
        this.health = 100;
        this.baseSpeed = 190;
        this.speed = 190;
        this.coins = 0;

        // Upgrade Multipliers & Modifiers
        this.damageMultiplier = 1.0;
        this.fireRateMultiplier = 1.0; // lower is faster
        this.critChance = 0.08;
        this.magnetRadius = 90;
        this.armor = 0; // Damage reduction percentage

        // Dash Mechanics
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDuration = 0.22;
        this.dashCooldown = 2.0;
        this.dashCooldownTimer = 0;
        this.dashSpeed = 600;
        this.dashDirX = 0;
        this.dashDirY = 0;

        // Invulnerability frame on hit
        this.invulnerableTimer = 0;

        // Weapon Manager
        this.weaponManager = new WeaponManager();
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.health = this.maxHealth;
        this.coins = 0;
        this.isDashing = false;
        this.dashCooldownTimer = 0;
        this.invulnerableTimer = 0;
        
        // Reset weapons ammo
        Object.values(this.weaponManager.weapons).forEach(w => {
            w.currentAmmo = w.magazineSize;
            w.reserveAmmo = w.maxReserve / 2;
        });
    }

    update(dt, inputManager, mobileController, camera, worldWidth, worldHeight, obstacleRects, audioManager, particleSystem) {
        // Timers
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;

        this.weaponManager.update(dt);

        // 1. Calculate Aim Angle
        if (mobileController.isTouchDevice) {
            if (mobileController.aimVector && mobileController.aimVector.active) {
                // Aim directly in direction of Right Aim & Shoot Stick (Mini Militia Style)
                this.angle = mobileController.aimVector.angle;
            } else if (mobileController.moveVector.magnitude > 0.1) {
                // Fallback to facing movement direction when left stick is moved
                this.angle = Math.atan2(mobileController.moveVector.dy, mobileController.moveVector.dx);
            }
        } else {
            // Desktop mouse aiming
            const screenX = this.x - camera.x;
            const screenY = this.y - camera.y;
            this.angle = Math.atan2(inputManager.mouse.y - screenY, inputManager.mouse.x - screenX);
        }

        // 2. Dash Logic
        if (this.isDashing) {
            this.dashTimer -= dt;
            this.x += this.dashDirX * this.dashSpeed * dt;
            this.y += this.dashDirY * this.dashSpeed * dt;

            // Spawn Dash Ghost Particles
            particleSystem.spawnParticle({
                x: this.x,
                y: this.y,
                color: 'rgba(100, 200, 255, 0.4)',
                size: this.radius,
                life: 0.15,
                type: 'circle'
            });

            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        } else {
            // Check Dash Input (Spacebar or Mobile Dash Button)
            const wantDash = inputManager.wasKeyJustPressed(' ') || mobileController.consumeDash();
            if (wantDash && this.dashCooldownTimer <= 0) {
                let { dx, dy } = inputManager.getMovementVector();
                if (mobileController.moveVector.magnitude > 0.1) {
                    dx = mobileController.moveVector.dx;
                    dy = mobileController.moveVector.dy;
                }
                if (dx === 0 && dy === 0) {
                    dx = Math.cos(this.angle);
                    dy = Math.sin(this.angle);
                }

                this.isDashing = true;
                this.dashTimer = this.dashDuration;
                this.dashCooldownTimer = this.dashCooldown;
                this.dashDirX = dx;
                this.dashDirY = dy;
                this.invulnerableTimer = this.dashDuration + 0.1; // Invulnerable while dashing
                audioManager.playReload(); // Dash sound cue
            } else {
                // Regular Movement Physics
                let { dx, dy } = inputManager.getMovementVector();
                if (mobileController.moveVector.magnitude > 0.1) {
                    dx = mobileController.moveVector.dx;
                    dy = mobileController.moveVector.dy;
                }

                this.x += dx * this.speed * dt;
                this.y += dy * this.speed * dt;
            }
        }

        // 3. Resolve Solid Obstacle Collisions
        for (let i = 0; i < obstacleRects.length; i++) {
            Collision.resolveCircleRect(this, obstacleRects[i]);
        }

        // 4. Clamp within world boundaries
        Collision.clampWorldBounds(this, worldWidth, worldHeight);

        // 5. Handle Reload Command
        if (inputManager.wasKeyJustPressed('r') || mobileController.consumeReload()) {
            this.weaponManager.currentWeapon.startReload(audioManager);
        }

        // 6. Handle Weapon Switch Keys (1, 2, 3, 4)
        if (inputManager.wasKeyJustPressed('1')) this.weaponManager.switchWeapon('pistol');
        if (inputManager.wasKeyJustPressed('2')) this.weaponManager.switchWeapon('shotgun');
        if (inputManager.wasKeyJustPressed('3')) this.weaponManager.switchWeapon('smg');
        if (inputManager.wasKeyJustPressed('4')) this.weaponManager.switchWeapon('rifle');
    }

    takeDamage(amount, particleSystem, audioManager) {
        if (this.invulnerableTimer > 0 || this.isDashing) return false;

        const reducedDamage = Math.max(1, amount * (1 - this.armor));
        this.health -= reducedDamage;
        this.invulnerableTimer = 0.35; // 350ms i-frames

        particleSystem.spawnBlood(this.x, this.y, 8, this.angle + Math.PI, false);
        particleSystem.triggerScreenShake(8);
        audioManager.playPlayerHit();

        if (this.health <= 0) {
            this.health = 0;
            audioManager.playZombieDeath();
            return true; // Player died!
        }
        return false;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    render(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);

        // Flash opacity if hit recently
        if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 1. Ground Shadow (Human Silhouette Shadow)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(2, 6, 20, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Animated Legs & Combat Boots
        const legOffset = Math.sin(this.walkAnimTimer || 0) * 8;
        ctx.fillStyle = '#1c2430'; // Dark tactical trousers
        // Left Leg & Boot
        ctx.save();
        ctx.translate(-4, -10 + legOffset);
        ctx.fillRect(-6, -4, 12, 8);
        ctx.fillStyle = '#0a0d12'; // Black combat boot
        ctx.fillRect(-7, -5, 5, 10);
        ctx.restore();

        // Right Leg & Boot
        ctx.fillStyle = '#1c2430';
        ctx.save();
        ctx.translate(-4, 10 - legOffset);
        ctx.fillRect(-6, -4, 12, 8);
        ctx.fillStyle = '#0a0d12';
        ctx.fillRect(-7, -5, 5, 10);
        ctx.restore();

        // 3. Human Torso & Tactical Vest (Broad shoulders)
        // Main shirt/jacket
        ctx.fillStyle = '#2d3b4e'; // Navy military jacket
        ctx.beginPath();
        ctx.ellipse(-2, 0, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tactical Armor Vest (Chest plate & shoulder pads)
        ctx.fillStyle = '#18202c'; // Dark kevlar plate
        ctx.fillRect(-10, -14, 18, 28);

        // Vest straps & pockets
        ctx.fillStyle = '#ff9900'; // Amber highlight clips
        ctx.fillRect(-4, -12, 4, 6);
        ctx.fillRect(-4, 6, 4, 6);

        ctx.fillStyle = '#3a4a60';
        ctx.fillRect(-8, -10, 5, 20);

        // 4. Arms & Hands Holding Weapon
        const currentWeaponId = this.weaponManager.currentWeaponId;

        // Left Arm & Hand
        ctx.fillStyle = '#2d3b4e'; // Sleeve
        ctx.beginPath();
        ctx.ellipse(4, -14, 8, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e5a77d'; // Human Skin Hand
        ctx.beginPath();
        ctx.arc(14, -10, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Right Arm & Hand
        ctx.fillStyle = '#2d3b4e';
        ctx.beginPath();
        ctx.ellipse(4, 14, 8, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e5a77d'; // Human Skin Hand
        ctx.beginPath();
        ctx.arc(18, 6, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 5. Detailed Top-Down Gun Models
        ctx.fillStyle = '#111318';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;

        if (currentWeaponId === 'pistol') {
            // Compact Handgun
            ctx.fillRect(8, 2, 16, 5);
            ctx.fillStyle = '#333';
            ctx.fillRect(8, 3, 10, 3);
        } else if (currentWeaponId === 'shotgun') {
            // Heavy Pump Action Shotgun
            ctx.fillRect(6, 1, 28, 7);
            ctx.fillStyle = '#7c4d25'; // Wooden pump grip
            ctx.fillRect(14, 2, 10, 5);
            ctx.fillStyle = '#111';
            ctx.fillRect(34, 3, 4, 3); // Twin barrel tip
        } else if (currentWeaponId === 'smg') {
            // Compact Submachine Gun with magazine
            ctx.fillRect(6, 1, 20, 6);
            ctx.fillStyle = '#222';
            ctx.fillRect(12, 7, 4, 8); // Curved Mag
            ctx.fillStyle = '#ff3333'; // Red laser sight dot emitter
            ctx.fillRect(24, 3, 4, 2);
        } else if (currentWeaponId === 'rifle') {
            // Long Tactical Assault Rifle
            ctx.fillRect(4, 1, 32, 7);
            ctx.fillStyle = '#1a222d';
            ctx.fillRect(14, 2, 14, 5); // Handguard
            ctx.fillStyle = '#222';
            ctx.fillRect(18, 8, 5, 10); // Extended Mag
            ctx.fillStyle = '#555';
            ctx.fillRect(8, 0, 8, 2); // Scope rail
        }

        // 6. Human Head, Hair & Tactical Helmet
        ctx.fillStyle = '#e5a77d'; // Neck & Ears
        ctx.beginPath();
        ctx.arc(-2, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Tactical Helmet / Cap
        ctx.fillStyle = '#1b2533';
        ctx.beginPath();
        ctx.arc(-3, 0, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff9900'; // Helmet rim band
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Goggles / Headset Band on Top of Helmet
        ctx.fillStyle = '#0f141d';
        ctx.fillRect(-7, -9, 4, 18);
        ctx.fillStyle = '#00e676'; // Goggles lens green glint
        ctx.fillRect(-2, -6, 3, 4);
        ctx.fillRect(-2, 2, 3, 4);

        ctx.restore();
    }

    // Render Dynamic Flashlight Cone Light Source
    renderFlashlight(ctx, camera, darknessAlpha) {
        if (darknessAlpha <= 0.05) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);

        // Radial Flashlight Gradient Cone
        const coneLength = 380;
        const coneAngle = Math.PI / 3.5; // ~50 degree flashlight beam

        const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, coneLength);
        grad.addColorStop(0, 'rgba(255, 255, 230, 0.95)');
        grad.addColorStop(0.3, 'rgba(255, 240, 200, 0.6)');
        grad.addColorStop(0.7, 'rgba(255, 230, 170, 0.2)');
        grad.addColorStop(1, 'rgba(255, 230, 170, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, coneLength, -coneAngle / 2, coneAngle / 2);
        ctx.closePath();
        ctx.fill();

        // Circular aura right around player body
        const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
        bodyGrad.addColorStop(0, 'rgba(255, 255, 230, 0.7)');
        bodyGrad.addColorStop(1, 'rgba(255, 255, 230, 0)');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
