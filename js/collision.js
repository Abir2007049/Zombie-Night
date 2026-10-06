/* ==========================================================================
   COLLISION ENGINE
   2D Geometry & Physics Collision Detection (Circles, AABB Rectangles, Rays)
   ========================================================================== */

class Collision {
    // Circle vs Circle Intersection
    static circleCircle(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const radiusSum = r1 + r2;
        return distSq <= radiusSum * radiusSum;
    }

    // Resolve overlap between two circles (pushes them apart)
    static resolveCircleOverlap(c1, c2) {
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const minDistance = c1.radius + c2.radius;

        if (dist < minDistance) {
            const overlap = minDistance - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            // Push each back by half the overlap
            c1.x -= nx * (overlap * 0.5);
            c1.y -= ny * (overlap * 0.5);
            c2.x += nx * (overlap * 0.5);
            c2.y += ny * (overlap * 0.5);
            return true;
        }
        return false;
    }

    // Circle vs Axis-Aligned Bounding Box (AABB) Rectangle
    static circleRect(cx, cy, radius, rx, ry, rw, rh) {
        // Find closest point on rectangle to circle center
        const closestX = Math.max(rx, Math.min(cx, rx + rw));
        const closestY = Math.max(ry, Math.min(cy, ry + rh));

        const dx = cx - closestX;
        const dy = cy - closestY;
        const distSq = dx * dx + dy * dy;

        return distSq <= radius * radius;
    }

    // Resolve Circle vs Solid Rectangle Collision (Prevents moving through walls/cars)
    static resolveCircleRect(entity, rect) {
        const closestX = Math.max(rect.x, Math.min(entity.x, rect.x + rect.w));
        const closestY = Math.max(rect.y, Math.min(entity.y, rect.y + rect.h));

        const dx = entity.x - closestX;
        const dy = entity.y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < entity.radius) {
            const overlap = entity.radius - dist;
            if (dist === 0) {
                // Entity center is exactly inside rectangle, push upward
                entity.y -= entity.radius;
            } else {
                entity.x += (dx / dist) * overlap;
                entity.y += (dy / dist) * overlap;
            }
            return true;
        }
        return false;
    }

    // Point vs Circle
    static pointCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return (dx * dx + dy * dy) <= radius * radius;
    }

    // Point vs Rectangle
    static pointRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }

    // Line segment vs Circle (Used for bullet raycasting)
    static lineCircle(x1, y1, x2, y2, cx, cy, radius) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 0.001;

        const u = (((cx - x1) * dx) + ((cy - y1) * dy)) / (len * len);
        const clampedU = Math.max(0, Math.min(1, u));

        const nearestX = x1 + clampedU * dx;
        const nearestY = y1 + clampedU * dy;

        const distDx = nearestX - cx;
        const distDy = nearestY - cy;

        return (distDx * distDx + distDy * distDy) <= radius * radius;
    }

    // Clamp circle position within world boundaries
    static clampWorldBounds(entity, worldWidth, worldHeight) {
        if (entity.x - entity.radius < 0) entity.x = entity.radius;
        if (entity.x + entity.radius > worldWidth) entity.x = worldWidth - entity.radius;
        if (entity.y - entity.radius < 0) entity.y = entity.radius;
        if (entity.y + entity.radius > worldHeight) entity.y = worldHeight - entity.radius;
    }
}
