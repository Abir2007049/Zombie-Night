/* ==========================================================================
   PARTICLE SYSTEM
   Blood Sprays, Muzzle Flashes, Floating Damage Numbers, Smoke & Fog
   ========================================================================== */

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.color = '#fff';
        this.size = 2;
        this.life = 0;
        this.maxLife = 1;
        this.alpha = 1;
        this.active = false;
        this.type = 'circle'; // circle, text, streak, blood_stain
        this.text = '';
        this.friction = 0.96;
        this.gravity = 0;
    }
}

class ParticleSystem {
    constructor() {
        this.pool = [];
        this.maxParticles = 800;
        for (let i = 0; i < this.maxParticles; i++) {
            this.pool.push(new Particle());
        }

        // Screen shake state
        this.shakeIntensity = 0;
        this.shakeDecay = 0.9;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // Permanent blood decals on map
        this.bloodDecals = [];
        this.maxDecals = 200;
    }

    spawnParticle(config) {
        const p = this.pool.find(item => !item.active);
        if (!p) return;

        p.x = config.x || 0;
        p.y = config.y || 0;
        p.vx = config.vx || 0;
        p.vy = config.vy || 0;
        p.color = config.color || '#ff3333';
        p.size = config.size || 3;
        p.life = config.life || 0.4;
        p.maxLife = p.life;
        p.alpha = config.alpha || 1;
        p.active = true;
        p.type = config.type || 'circle';
        p.text = config.text || '';
        p.friction = config.friction !== undefined ? config.friction : 0.95;
        p.gravity = config.gravity || 0;
    }

    // Spawn Blood Spray
    spawnBlood(x, y, count = 12, angle = 0, isCrit = false) {
        for (let i = 0; i < count; i++) {
            const spreadAngle = angle + (Math.random() - 0.5) * 1.2;
            const speed = (Math.random() * 180 + 40) * (isCrit ? 1.5 : 1.0);
            const size = Math.random() * 4 + 2;
            const color = isCrit ? '#ff0000' : (Math.random() > 0.4 ? '#cc0000' : '#880000');

            this.spawnParticle({
                x: x,
                y: y,
                vx: Math.cos(spreadAngle) * speed,
                vy: Math.sin(spreadAngle) * speed,
                color: color,
                size: size,
                life: Math.random() * 0.3 + 0.2,
                friction: 0.88,
                type: 'circle'
            });
        }

        // Add persistent ground splatter decal
        if (Math.random() > 0.3) {
            this.bloodDecals.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                radius: Math.random() * 12 + 6,
                color: 'rgba(100, 0, 0, 0.6)'
            });
            if (this.bloodDecals.length > this.maxDecals) {
                this.bloodDecals.shift();
            }
        }
    }

    // Spawn Muzzle Flash Sparks & Smoke
    spawnMuzzleFlash(x, y, angle) {
        for (let i = 0; i < 6; i++) {
            const spreadAngle = angle + (Math.random() - 0.5) * 0.6;
            const speed = Math.random() * 250 + 100;
            this.spawnParticle({
                x: x,
                y: y,
                vx: Math.cos(spreadAngle) * speed,
                vy: Math.sin(spreadAngle) * speed,
                color: Math.random() > 0.5 ? '#ffcc00' : '#ff6600',
                size: Math.random() * 3 + 1,
                life: 0.08,
                friction: 0.8,
                type: 'circle'
            });
        }
    }

    // Spawn Floating Damage Text
    spawnDamageText(x, y, damage, isCrit = false) {
        const text = isCrit ? `CRIT! ${Math.round(damage)}` : `${Math.round(damage)}`;
        this.spawnParticle({
            x: x + (Math.random() - 0.5) * 10,
            y: y - 10,
            vx: (Math.random() - 0.5) * 20,
            vy: -60 - Math.random() * 30,
            color: isCrit ? '#ff3300' : '#ffffff',
            size: isCrit ? 18 : 14,
            life: 0.6,
            friction: 0.92,
            type: 'text',
            text: text
        });
    }

    // Spawn Explosion Effects
    spawnExplosion(x, y, radius = 60) {
        this.triggerScreenShake(15);
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 350 + 50;
            this.spawnParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: Math.random() > 0.3 ? '#ff4400' : '#ffbb00',
                size: Math.random() * 6 + 3,
                life: Math.random() * 0.5 + 0.2,
                friction: 0.9,
                type: 'circle'
            });
        }
    }

    triggerScreenShake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    update(dt) {
        // Update Screen Shake
        if (this.shakeIntensity > 0.5) {
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeIntensity = 0;
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }

        // Update Active Particles
        for (let i = 0; i < this.pool.length; i++) {
            const p = this.pool[i];
            if (!p.active) continue;

            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                continue;
            }

            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.gravity * dt;

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.alpha = Math.max(0, p.life / p.maxLife);
        }
    }

    renderDecals(ctx, camera) {
        // Render permanent blood ground splatters
        for (let i = 0; i < this.bloodDecals.length; i++) {
            const b = this.bloodDecals[i];
            const screenX = b.x - camera.x;
            const screenY = b.y - camera.y;

            // Frustum cull
            if (screenX < -50 || screenX > camera.width + 50 || screenY < -50 || screenY > camera.height + 50) continue;

            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, b.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderParticles(ctx, camera) {
        for (let i = 0; i < this.pool.length; i++) {
            const p = this.pool[i];
            if (!p.active) continue;

            const screenX = p.x - camera.x;
            const screenY = p.y - camera.y;

            ctx.save();
            ctx.globalAlpha = p.alpha;

            if (p.type === 'circle') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'text') {
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.size}px 'Orbitron', sans-serif`;
                ctx.textAlign = 'center';
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 4;
                ctx.fillText(p.text, screenX, screenY);
            }

            ctx.restore();
        }
    }
}
