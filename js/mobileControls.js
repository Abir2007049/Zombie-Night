/* ==========================================================================
   MOBILE CONTROLLER
   Virtual Joystick & Action Touch Controls for Mobile/Tablet Compatibility
   ========================================================================== */

class MobileController {
    constructor() {
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.moveVector = { dx: 0, dy: 0, magnitude: 0 };
        this.isShooting = false;
        this.reloadRequested = false;
        this.dashRequested = false;

        // Joystick internal math
        this.joystickTouchId = null;
        this.joystickCenter = { x: 0, y: 0 };
        this.maxRadius = 50; // max joystick drag distance in pixels

        this.initDOM();
    }

    initDOM() {
        const joystickZone = document.getElementById('joystick-move');
        const stick = document.querySelector('.joystick-stick');

        const btnShoot = document.getElementById('btn-mobile-shoot');
        const btnReload = document.getElementById('btn-mobile-reload');
        const btnDash = document.getElementById('btn-mobile-dash');

        if (!joystickZone || !stick) return;

        // Joystick Touch Event Listeners
        joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.joystickTouchId !== null) return;
            const touch = e.changedTouches[0];
            this.joystickTouchId = touch.identifier;

            const rect = joystickZone.getBoundingClientRect();
            this.joystickCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            this.updateJoystick(touch, stick);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (this.joystickTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystickTouchId) {
                    this.updateJoystick(touch, stick);
                    break;
                }
            }
        }, { passive: false });

        const resetJoystick = (e) => {
            if (this.joystickTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystickTouchId) {
                    this.joystickTouchId = null;
                    this.moveVector = { dx: 0, dy: 0, magnitude: 0 };
                    stick.style.transform = `translate(0px, 0px)`;
                    break;
                }
            }
        };

        window.addEventListener('touchend', resetJoystick, { passive: false });
        window.addEventListener('touchcancel', resetJoystick, { passive: false });

        // Action Buttons
        if (btnShoot) {
            btnShoot.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.isShooting = true;
            }, { passive: false });

            btnShoot.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.isShooting = false;
            }, { passive: false });
        }

        if (btnReload) {
            btnReload.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.reloadRequested = true;
            }, { passive: false });
        }

        if (btnDash) {
            btnDash.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.dashRequested = true;
            }, { passive: false });
        }
    }

    updateJoystick(touch, stick) {
        const deltaX = touch.clientX - this.joystickCenter.x;
        const deltaY = touch.clientY - this.joystickCenter.y;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const angle = Math.atan2(deltaY, deltaX);
        const clampedDist = Math.min(dist, this.maxRadius);

        const moveX = Math.cos(angle) * clampedDist;
        const moveY = Math.sin(angle) * clampedDist;

        stick.style.transform = `translate(${moveX}px, ${moveY}px)`;

        const normMag = clampedDist / this.maxRadius;
        this.moveVector = {
            dx: Math.cos(angle) * normMag,
            dy: Math.sin(angle) * normMag,
            magnitude: normMag
        };
    }

    consumeReload() {
        if (this.reloadRequested) {
            this.reloadRequested = false;
            return true;
        }
        return false;
    }

    consumeDash() {
        if (this.dashRequested) {
            this.dashRequested = false;
            return true;
        }
        return false;
    }
}
