/* ==========================================================================
   BULLET SYSTEM
   Object Pooled Projectiles (Bullets, Shotgun Pellets, Explosive Shells)
   ========================================================================== */

class Bullet {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.prevX = 0;
        this.prevY = 0;
        this.vx = 0;
        this.vy = 0;
        this.damage = 10;
        this.speed = 1000;
        this.penetration = 1;
        this.hitEntities = []; // Array of zombie IDs already hit by this bullet
        this.maxDistance = 1200;
        this.distanceTraveled = 0;
        this.isCritical = false;
        this.color = '#ffffaa';
        this.radius = 3;
        this.active = false;
        this.isExplosive = false;
    }
}

class BulletPool {
    constructor() {
        this.pool = [];
        this.maxBullets = 300;
        for (let i = 0; i < this.maxBullets; i++) {
            this.pool.push(new Bullet());
        }
    }

    spawn(config) {
        const b = this.pool.find(bullet => !bullet.active);
        if (!b) return null;

        b.reset();
        b.x = config.x;
        b.y = config.y;
        b.prevX = config.x;
        b.prevY = config.y;

        const angle = config.angle;
        b.speed = config.speed || 1200;
        b.vx = Math.cos(angle) * b.speed;
        b.vy = Math.sin(angle) * b.speed;

        b.damage = config.damage || 20;
        b.penetration = config.penetration || 1;
        b.maxDistance = config.maxDistance || 1000;
        b.isCritical = config.isCritical || false;
        b.color = config.color || '#ffff88';
        b.radius = config.radius || 3;
        b.isExplosive = config.isExplosive || false;
        b.active = true;

        return b;
    }

    update(dt, worldWidth, worldHeight, obstacleRects, zombies, particleSystem, audioManager, onZombieKilled) {
        for (let i = 0; i < this.pool.length; i++) {
            const b = this.pool[i];
            if (!b.active) continue;

            b.prevX = b.x;
            b.prevY = b.y;

            const moveStepX = b.vx * dt;
            const moveStepY = b.vy * dt;
            const stepDist = Math.sqrt(moveStepX * moveStepX + moveStepY * moveStepY);

            b.x += moveStepX;
            b.y += moveStepY;
            b.distanceTraveled += stepDist;

            // 1. Check max distance or world bounds
            if (b.distanceTraveled >= b.maxDistance ||
                b.x < 0 || b.x > worldWidth || b.y < 0 || b.y > worldHeight) {
                b.active = false;
                continue;
            }

            // 2. Check collision with solid map obstacles (buildings, cars)
            let hitObstacle = false;
            for (let j = 0; j < obstacleRects.length; j++) {
                const rect = obstacleRects[j];
                if (Collision.lineCircle(b.prevX, b.prevY, b.x, b.y, rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) / 2)) {
                    if (Collision.circleRect(b.x, b.y, b.radius, rect.x, rect.y, rect.w, rect.h)) {
                        hitObstacle = true;
                        break;
                    }
                }
            }

            if (hitObstacle) {
                b.active = false;
                // Spark effect on wall hit
                particleSystem.spawnMuzzleFlash(b.x, b.y, Math.atan2(-b.vy, -b.vx));
                continue;
            }

            // 3. Check collision with zombies
            for (let z = 0; z < zombies.length; z++) {
                const zombie = zombies[z];
                if (!zombie.active || zombie.isDead) continue;
                if (b.hitEntities.includes(zombie.id)) continue;

                if (Collision.circleCircle(b.x, b.y, b.radius, zombie.x, zombie.y, zombie.radius)) {
                    // Hit zombie!
                    b.hitEntities.push(zombie.id);
                    const killed = zombie.takeDamage(b.damage, b.vx, b.vy, b.isCritical, particleSystem, audioManager);
                    
                    if (killed && onZombieKilled) {
                        onZombieKilled(zombie);
                    }

                    b.penetration--;

                    if (b.isExplosive) {
                        particleSystem.spawnExplosion(b.x, b.y, 70);
                        audioManager.playExplosion();
                        // Splash damage to surrounding zombies
                        for (let k = 0; k < zombies.length; k++) {
                            const otherZ = zombies[k];
                            if (otherZ.active && !otherZ.isDead && otherZ.id !== zombie.id) {
                                if (Collision.circleCircle(b.x, b.y, 70, otherZ.x, otherZ.y, otherZ.radius)) {
                                    otherZ.takeDamage(b.damage * 0.7, b.vx * 0.5, b.vy * 0.5, false, particleSystem, audioManager);
                                }
                            }
                        }
                    }

                    if (b.penetration <= 0) {
                        b.active = false;
                        break;
                    }
                }
            }
        }
    }

    render(ctx, camera) {
        for (let i = 0; i < this.pool.length; i++) {
            const b = this.pool[i];
            if (!b.active) continue;

            const screenX = b.x - camera.x;
            const screenY = b.y - camera.y;

            // Frustum cull
            if (screenX < -20 || screenX > camera.width + 20 || screenY < -20 || screenY > camera.height + 20) continue;

            ctx.save();
            ctx.strokeStyle = b.color;
            ctx.lineWidth = b.radius * 2;
            ctx.lineCap = 'round';
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 6;

            const prevScreenX = b.prevX - camera.x;
            const prevScreenY = b.prevY - camera.y;

            ctx.beginPath();
            ctx.moveTo(prevScreenX, prevScreenY);
            ctx.lineTo(screenX, screenY);
            ctx.stroke();

            ctx.restore();
        }
    }
}
