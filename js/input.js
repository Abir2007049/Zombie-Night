/* ==========================================================================
   INPUT MANAGER
   Desktop Keyboard, Mouse Movement & Click Tracking
   ========================================================================== */

class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            isDown: false,
            rightDown: false
        };
        this.keyJustPressed = {};
        
        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (!this.keys[key]) {
                this.keyJustPressed[key] = true;
            }
            this.keys[key] = true;

            // Prevent scroll on space & arrow keys
            if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.isDown = true;
            } else if (e.button === 2) {
                this.mouse.rightDown = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.isDown = false;
            } else if (e.button === 2) {
                this.mouse.rightDown = false;
            }
        });

        // Context menu override to allow right click actions
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    updateWorldMouse(cameraX, cameraY) {
        this.mouse.worldX = this.mouse.x + cameraX;
        this.mouse.worldY = this.mouse.y + cameraY;
    }

    isKeyDown(key) {
        return !!this.keys[key.toLowerCase()];
    }

    wasKeyJustPressed(key) {
        const k = key.toLowerCase();
        if (this.keyJustPressed[k]) {
            this.keyJustPressed[k] = false;
            return true;
        }
        return false;
    }

    getMovementVector() {
        let dx = 0;
        let dy = 0;

        if (this.isKeyDown('w') || this.isKeyDown('arrowup')) dy -= 1;
        if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) dy += 1;
        if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) dx -= 1;
        if (this.isKeyDown('d') || this.isKeyDown('arrowright')) dx += 1;

        // Normalize vector for diagonal movement speed consistency
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        return { dx, dy };
    }

    resetInputs() {
        this.keyJustPressed = {};
        this.mouse.isDown = false;
        this.mouse.rightDown = false;
    }
}
