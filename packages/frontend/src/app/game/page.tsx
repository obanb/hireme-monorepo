'use client';

import { useEffect, useRef } from "react";

export default function NpcCameraGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const npcImg = new Image();
        npcImg.src = "/images/girl1.png";

        const keysPressed = new Set<string>();
        const speed = 0.2;

        // World and player setup
        const mapWidth = 2000;
        const mapHeight = 2000;
        const gridSize = 100;
        const playerSize = 64;
        const player = { x: 100, y: 100 };
        let lastTime = 0;

        // Obstacles (e.g., trees)
        const obstacles = [
            { x: 400, y: 300, width: 64, height: 64 }, // example tree
        ];

        // Collision helper
        function isColliding(ax: number, ay: number, aw: number, ah: number,
                             bx: number, by: number, bw: number, bh: number): boolean {
            return ax < bx + bw &&
                ax + aw > bx &&
                ay < by + bh &&
                ay + ah > by;
        }

        function willCollide(nextX: number, nextY: number): boolean {
            return obstacles.some(obj =>
                isColliding(nextX, nextY, playerSize, playerSize, obj.x, obj.y, obj.width, obj.height)
            );
        }

        function handleKeyDown(e: KeyboardEvent) {
            keysPressed.add(e.key.toLowerCase());
        }

        function handleKeyUp(e: KeyboardEvent) {
            keysPressed.delete(e.key.toLowerCase());
        }

        npcImg.onload = () => {
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            function gameLoop(time: number) {
                // for consistent movement - also if framerate drops/gets higher
                const delta = time - lastTime;
                lastTime = time;

                // Intended movement
                let dx = 0;
                let dy = 0;
                if (keysPressed.has("arrowright") || keysPressed.has("d")) dx += speed * delta;
                if (keysPressed.has("arrowleft") || keysPressed.has("a")) dx -= speed * delta;
                if (keysPressed.has("arrowdown") || keysPressed.has("s")) dy += speed * delta;
                if (keysPressed.has("arrowup") || keysPressed.has("w")) dy -= speed * delta;

                const nextX = player.x + dx;
                const nextY = player.y + dy;

                // Compute camera offset if player moves
                const halfW = canvasWidth / 2;
                const halfH = canvasHeight / 2;
                const camX = Math.min(Math.max(nextX - halfW, 0), mapWidth - canvasWidth);
                const camY = Math.min(Math.max(nextY - halfH, 0), mapHeight - canvasHeight);

                // Prevent moving into obstacles
                if (!willCollide(nextX, player.y)) {
                    player.x = nextX;
                }
                if (!willCollide(player.x, nextY)) {
                    player.y = nextY;
                }

                // Clamp to map edges
                player.x = Math.max(0, Math.min(mapWidth - playerSize, player.x));
                player.y = Math.max(0, Math.min(mapHeight - playerSize, player.y));

                const cameraOffset = {
                    x: Math.min(Math.max(player.x - canvasWidth / 2, 0), mapWidth - canvasWidth),
                    y: Math.min(Math.max(player.y - canvasHeight / 2, 0), mapHeight - canvasHeight),
                };

                // Clear canvas
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);

                // Draw background
                ctx.fillStyle = "#e0ffe0";
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                // Draw grid
                const startX = Math.floor(cameraOffset.x / gridSize) * gridSize;
                const endX = Math.ceil((cameraOffset.x + canvasWidth) / gridSize) * gridSize;
                const startY = Math.floor(cameraOffset.y / gridSize) * gridSize;
                const endY = Math.ceil((cameraOffset.y + canvasHeight) / gridSize) * gridSize;

                ctx.strokeStyle = "#c0c0c0";
                for (let x = startX; x <= endX; x += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(x - cameraOffset.x, 0);
                    ctx.lineTo(x - cameraOffset.x, canvasHeight);
                    ctx.stroke();
                }
                for (let y = startY; y <= endY; y += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(0, y - cameraOffset.y);
                    ctx.lineTo(canvasWidth, y - cameraOffset.y);
                    ctx.stroke();
                }

                // Draw obstacles (tree)
                for (const obj of obstacles) {
                    ctx.fillStyle = "#228B22"; // tree green
                    ctx.fillRect(
                        obj.x - cameraOffset.x,
                        obj.y - cameraOffset.y,
                        obj.width,
                        obj.height
                    );
                }

                // Draw player
                ctx.drawImage(
                    npcImg,
                    player.x - cameraOffset.x,
                    player.y - cameraOffset.y,
                    playerSize,
                    playerSize
                );

                requestAnimationFrame(gameLoop);
            }

            requestAnimationFrame(gameLoop);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    return (
        <div>
            <h1>NPC with Camera</h1>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                style={{ border: "1px solid black", background: "#eee" }}
            />
        </div>
    );
}
