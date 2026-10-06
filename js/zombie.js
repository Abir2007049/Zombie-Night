/* ==========================================================================
   ZOMBIE SYSTEM & AI
   Zombie Archetypes (Normal, Fast, Tank, Boss), Flocking AI & Combat
   ========================================================================== */

class Zombie {
    constructor(id) {
        this.id = id;
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.type = 'normal'; // normal, fast, tank, boss
        this.health = 50;
        this.maxHealth = 50;
        this.speed = 45;
        this.damage = 10;
        this.reward = 10;
        this.radius = 16;

        this.angle = 0;
        this.active = false;
        this.isDead = false;

        this.hitFlashTimer = 0;
        this.attackCooldownTimer = 0;
        this.attackRate = 0.8; // Seconds between attacks

        // Special Boss attack timers
        this.isBoss = false;
        this.bossStompTimer = 0;
        this.name = 'Zombie';
        this.color = '#448844';
    }

    init(type, x, y, waveMultiplier = 1.0) {
        this.reset();
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;

        if (type === 'normal') {
            this.name = 'Walker Zombie';
            this.maxHealth = 50 * waveMultiplier;
            this.speed = (Math.random() * 15 + 40) * Math.min(1.4, waveMultiplier);
            this.damage = 10 * waveMultiplier;
            this.reward = 10;
            this.radius = 16;
            this.color = '#4c8c4a';
        } else if (type === 'fast') {
            this.name = 'Runner Zombie';
            this.maxHealth = 35 * waveMultiplier;
            this.speed = (Math.random() * 20 + 85) * Math.min(1.3, waveMultiplier);
            this.damage = 8 * waveMultiplier;
            this.reward = 15;
            this.radius = 14;
            this.color = '#a04838';
        } else if (type === 'tank') {
            this.name = 'Tank Zombie';
            this.maxHealth = 260 * waveMultiplier;
            this.speed = 28 * Math.min(1.3, waveMultiplier);
            this.damage = 25 * waveMultiplier;
            this.reward = 55;
            this.radius = 24;
            this.color = '#5a3d66';
        } else if (type === 'boss') {
            this.name = 'TITAN BOSS ZOMBIE';
            this.isBoss = true;
            this.maxHealth = 1200 * waveMultiplier;
            this.speed = 36;
            this.damage = 35 * waveMultiplier;
            this.reward = 300;
            this.radius = 36;
            this.color = '#8b0000';
        }

        this.health = this.maxHealth;
    }

    update(dt, player, zombies, obstacleRects, particleSystem, audioManager, onPlayerAttacked) {
        if (!this.active || this.isDead) return;

        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dt;

        // 1. Calculate direction toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy) || 0.001;

        this.angle = Math.atan2(dy, dx);

        // 2. Flocking / Separation force from other zombies (prevents stacking)
        let sepX = 0;
        let sepY = 0;
        for (let i = 0; i < zombies.length; i++) {
            const other = zombies[i];
            if (other.active && !other.isDead && other.id !== this.id) {
                const zdx = this.x - other.x;
                const zdy = this.y - other.y;
                const zdist = Math.sqrt(zdx * zdx + zdy * zdy) || 0.001;
                const minDist = this.radius + other.radius + 6;

                if (zdist < minDist) {
                    const force = (minDist - zdist) / minDist;
                    sepX += (zdx / zdist) * force * 1.5;
                    sepY += (zdy / zdist) * force * 1.5;
                }
            }
        }

        // Combine velocity towards player + separation force
        let moveX = (dx / distToPlayer) + sepX;
        let moveY = (dy / distToPlayer) + sepY;
        const moveLen = Math.sqrt(moveX * moveX + moveY * moveY) || 1;

        moveX = (moveX / moveLen) * this.speed * dt;
        moveY = (moveY / moveLen) * this.speed * dt;

        this.x += moveX;
        this.y += moveY;

        // Walk animation timer
        this.walkAnimTimer = (this.walkAnimTimer || 0) + dt * (this.speed * 0.15);

        // 3. Resolve Obstacle Collision
        for (let i = 0; i < obstacleRects.length; i++) {
            Collision.resolveCircleRect(this, obstacleRects[i]);
        }

        // 4. Attack Player if close
        if (distToPlayer <= this.radius + player.radius + 2) {
            if (this.attackCooldownTimer <= 0) {
                this.attackCooldownTimer = this.attackRate;
                if (onPlayerAttacked) {
                    onPlayerAttacked(this.damage);
                }
            }
        }

        // Special Boss Ground Stomp Attack every 6 seconds
        if (this.isBoss) {
            this.bossStompTimer += dt;
            if (this.bossStompTimer >= 6.0) {
                this.bossStompTimer = 0;
                particleSystem.spawnExplosion(this.x, this.y, 110);
                audioManager.playExplosion();
                if (distToPlayer < 120) {
                    onPlayerAttacked(this.damage * 1.2);
                }
            }
        }
    }

    takeDamage(amount, bulletVx, bulletVy, isCrit, particleSystem, audioManager) {
        if (this.isDead) return false;

        this.health -= amount;
        this.hitFlashTimer = 0.12;

        // Knockback physics
        const kbForce = this.type === 'tank' || this.isBoss ? 4 : 12;
        this.x += (bulletVx / 1000) * kbForce;
        this.y += (bulletVy / 1000) * kbForce;

        particleSystem.spawnBlood(this.x, this.y, isCrit ? 14 : 7, Math.atan2(bulletVy, bulletVx), isCrit);
        particleSystem.spawnDamageText(this.x, this.y, amount, isCrit);
        audioManager.playZombieHit();

        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.active = false;
            particleSystem.spawnBlood(this.x, this.y, 25, Math.atan2(bulletVy, bulletVx), true);
            audioManager.playZombieDeath();
            return true; // Zombie killed!
        }
        return false;
    }

    render(ctx, camera) {
        if (!this.active) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Frustum cull
        if (screenX < -60 || screenX > camera.width + 60 || screenY < -60 || screenY > camera.height + 60) return;

        ctx.save();
        ctx.translate(screenX, screenY);

        // 1. Ground Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(2, 6, this.radius * 1.1, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(this.angle);

        // Hit flash color override
        const isFlash = this.hitFlashTimer > 0;
        const baseColor = isFlash ? '#ffffff' : this.color;

        // 2. Shuffling Legs & Dragging Feet
        const legCycle = Math.sin(this.walkAnimTimer || 0) * 6;
        ctx.fillStyle = isFlash ? '#ffffff' : '#1e201b'; // Tattered dark pants
        ctx.save();
        ctx.translate(-4, -8 + legCycle);
        ctx.fillRect(-5, -4, 10, 7);
        ctx.fillStyle = isFlash ? '#ffffff' : '#4a5442'; // Rotting foot/shoe
        ctx.fillRect(-6, -4, 4, 8);
        ctx.restore();

        ctx.fillStyle = isFlash ? '#ffffff' : '#1e201b';
        ctx.save();
        ctx.translate(-4, 8 - legCycle);
        ctx.fillRect(-5, -4, 10, 7);
        ctx.fillStyle = isFlash ? '#ffffff' : '#4a5442';
        ctx.fillRect(-6, -4, 4, 8);
        ctx.restore();

        // 3. Humanoid Zombie Torso & Tattered Clothes
        if (this.isBoss) {
            // Boss Spikes & Aura
            ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Mutated Boss Body
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.ellipse(-2, 0, 22, 28, 0, 0, Math.PI * 2);
            ctx.fill();

            // Shoulder Bone Spikes
            ctx.fillStyle = isFlash ? '#ffffff' : '#ddccaa';
            ctx.beginPath();
            ctx.moveTo(-10, -26); ctx.lineTo(10, -38); ctx.lineTo(0, -20);
            ctx.moveTo(-10, 26); ctx.lineTo(10, 38); ctx.lineTo(0, 20);
            ctx.fill();
        } else if (this.type === 'tank') {
            // Tank Bulky Shoulders
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.ellipse(-2, 0, 16, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            // Torn vest
            ctx.fillStyle = isFlash ? '#ffffff' : '#281e30';
            ctx.fillRect(-10, -16, 16, 32);
        } else if (this.type === 'fast') {
            // Fast Runner Lean Stance
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            // Blood stains on back
            ctx.fillStyle = isFlash ? '#ffffff' : '#880000';
            ctx.fillRect(-6, -6, 8, 12);
        } else {
            // Normal Walker Torso
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.ellipse(-2, 0, 12, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            // Tattered shirt
            ctx.fillStyle = isFlash ? '#ffffff' : '#354d32';
            ctx.fillRect(-8, -12, 14, 24);
        }

        // 4. Reaching Arms & Clawed Hands (Extended forward to grab player)
        const armReach = this.radius * 0.9;
        const armSwing = Math.cos(this.walkAnimTimer || 0) * 4;

        ctx.fillStyle = baseColor;

        // Left Arm & Claw
        ctx.beginPath();
        ctx.ellipse(armReach / 2, -this.radius * 0.75 + armSwing, armReach, 4.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Claw fingers
        ctx.fillStyle = isFlash ? '#ffffff' : '#1e331e';
        ctx.fillRect(armReach + 4, -this.radius * 0.75 + armSwing - 3, 5, 6);

        // Right Arm & Claw
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.ellipse(armReach / 2, this.radius * 0.75 - armSwing, armReach, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isFlash ? '#ffffff' : '#1e331e';
        ctx.fillRect(armReach + 4, this.radius * 0.75 - armSwing - 3, 5, 6);

        // 5. Zombie Head, Rotting Scalp & Glowing Eyes
        ctx.fillStyle = isFlash ? '#ffffff' : (this.type === 'tank' ? '#6b5278' : '#5c9c58'); // Rotting Head Skin
        ctx.beginPath();
        ctx.arc(2, 0, this.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Rotting wound / exposed skull patch
        ctx.fillStyle = isFlash ? '#ffffff' : '#770000';
        ctx.fillRect(-2, -4, 6, 6);

        // Pale / Glowing Zombie Eyes
        ctx.fillStyle = isFlash ? '#ffffff' : (this.isBoss ? '#ffff00' : (this.type === 'fast' ? '#ff2200' : '#ffaa00'));
        ctx.beginPath();
        ctx.arc(6, -4, 2.5, 0, Math.PI * 2);
        ctx.arc(6, 4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Gaping bloody mouth gaping forward
        ctx.fillStyle = '#220000';
        ctx.beginPath();
        ctx.ellipse(7, 0, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Render Health Bar above zombie if damaged
        if (this.health < this.maxHealth && !this.isBoss) {
            const barW = this.radius * 2.2;
            const barH = 5;
            const barX = screenX - barW / 2;
            const barY = screenY - this.radius - 10;
            const pct = Math.max(0, this.health / this.maxHealth);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(barX, barY, barW * pct, barH);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeRect(barX, barY, barW, barH);
        }
    }
}

class ZombiePool {
    constructor() {
        this.pool = [];
        this.maxZombies = 150;
        for (let i = 0; i < this.maxZombies; i++) {
            this.pool.push(new Zombie(i));
        }
    }

    spawn(type, x, y, waveMultiplier = 1.0) {
        const z = this.pool.find(zombie => !zombie.active);
        if (!z) return null;

        z.init(type, x, y, waveMultiplier);
        return z;
    }

    getActiveZombies() {
        return this.pool.filter(z => z.active && !z.isDead);
    }

    getBossZombie() {
        return this.pool.find(z => z.active && !z.isDead && z.isBoss);
    }
}
