/* ==========================================================================
   MOBILE CONTROLLER
   Mini Militia Style Twin-Stick Aim & Shoot System
   Left Stick: Player Movement | Right Stick: Aim Direction + Continuous Shooting
   ========================================================================== */

class MobileController {
    constructor() {
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.moveVector = { dx: 0, dy: 0, magnitude: 0 };
        this.aimVector = { dx: 0, dy: 0, angle: 0, active: false };
        this.isShooting = false;
        this.reloadRequested = false;
        this.dashRequested = false;

        // Joystick tracking IDs & centers
        this.moveTouchId = null;
        this.moveCenter = { x: 0, y: 0 };

        this.aimTouchId = null;
        this.aimCenter = { x: 0, y: 0 };

        this.maxRadius = 45; // Max joystick drag radius in pixels

        this.initDOM();
    }

    initDOM() {
        const moveZone = document.getElementById('joystick-move');
        const moveStick = document.querySelector('.stick-move');

        const aimZone = document.getElementById('joystick-aim');
        const aimStick = document.querySelector('.stick-aim');

        const btnReload = document.getElementById('btn-mobile-reload');
        const btnDash = document.getElementById('btn-mobile-dash');

        // 1. LEFT JOYSTICK - PLAYER MOVEMENT
        if (moveZone && moveStick) {
            moveZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.moveTouchId !== null) return;
                const touch = e.changedTouches[0];
                this.moveTouchId = touch.identifier;

                const rect = moveZone.getBoundingClientRect();
                this.moveCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };

                this.updateMoveJoystick(touch, moveStick);
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (this.moveTouchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === this.moveTouchId) {
                        this.updateMoveJoystick(touch, moveStick);
                        break;
                    }
                }
            }, { passive: false });

            const resetMoveJoystick = (e) => {
                if (this.moveTouchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.moveTouchId) {
                        this.moveTouchId = null;
                        this.moveVector = { dx: 0, dy: 0, magnitude: 0 };
                        moveStick.style.transform = `translate(0px, 0px)`;
                        break;
                    }
                }
            };

            window.addEventListener('touchend', resetMoveJoystick, { passive: false });
            window.addEventListener('touchcancel', resetMoveJoystick, { passive: false });
        }

        // 2. RIGHT JOYSTICK - AIM & SHOOT (MINI MILITIA STYLE)
        if (aimZone && aimStick) {
            aimZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.aimTouchId !== null) return;
                const touch = e.changedTouches[0];
                this.aimTouchId = touch.identifier;

                const rect = aimZone.getBoundingClientRect();
                this.aimCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };

                this.updateAimJoystick(touch, aimStick);
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (this.aimTouchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === this.aimTouchId) {
                        this.updateAimJoystick(touch, aimStick);
                        break;
                    }
                }
            }, { passive: false });

            const resetAimJoystick = (e) => {
                if (this.aimTouchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.aimTouchId) {
                        this.aimTouchId = null;
                        this.aimVector = { dx: 0, dy: 0, angle: 0, active: false };
                        this.isShooting = false;
                        aimStick.style.transform = `translate(0px, 0px)`;
                        break;
                    }
                }
            };

            window.addEventListener('touchend', resetAimJoystick, { passive: false });
            window.addEventListener('touchcancel', resetAimJoystick, { passive: false });
        }

        // 3. ACTION BUTTONS
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

    updateMoveJoystick(touch, stick) {
        const deltaX = touch.clientX - this.moveCenter.x;
        const deltaY = touch.clientY - this.moveCenter.y;
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

    updateAimJoystick(touch, stick) {
        const deltaX = touch.clientX - this.aimCenter.x;
        const deltaY = touch.clientY - this.aimCenter.y;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        const angle = Math.atan2(deltaY, deltaX);
        const clampedDist = Math.min(dist, this.maxRadius);

        const moveX = Math.cos(angle) * clampedDist;
        const moveY = Math.sin(angle) * clampedDist;

        stick.style.transform = `translate(${moveX}px, ${moveY}px)`;

        const normMag = clampedDist / this.maxRadius;
        this.aimVector = {
            dx: Math.cos(angle) * normMag,
            dy: Math.sin(angle) * normMag,
            angle: angle,
            active: normMag > 0.1
        };

        // Automatically trigger shooting while dragging right stick!
        this.isShooting = normMag > 0.15;
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
