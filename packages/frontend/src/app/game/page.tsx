'use client';

import { useEffect, useRef } from "react";

export default function NpcCameraGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const keysPressed = new Set<string>();
        const speed = 0.2;

        // World and player setup
        const mapWidth = 2000;
        const mapHeight = 2000;
        const gridSize = 100;
        const playerSize = 64;
        const player = { x: 100, y: 100 };
        let lastTime = 0;
        let walkCycle = 0;

        // NPCs
        const npcs = [
            { x: 300, y: 200, type: 'miner' },
            { x: 500, y: 150, type: 'wizard' },
        ];

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

        // Function to draw a pixel art character
        function drawPixelArtCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, cycle: number) {
            const pixelSize = size / 16; // 16x16 sprite
            
            // Use imageSmoothingEnabled for crisp pixel art
            ctx.imageSmoothingEnabled = false;
            
            // Determine if walking (cycle alternates between 0 and 1)
            const isWalking = cycle % 2 === 1;
            
            // Character colors
            const skinColor = '#FFDBAC';
            const hairColor = '#8B4513';
            const shirtColor = '#4A90E2';
            const pantsColor = '#654321';
            const shoeColor = '#000000';
            const eyeColor = '#000000';
            
            // Hair (top) - y: 0-2
            ctx.fillStyle = hairColor;
            ctx.fillRect(x + 4 * pixelSize, y + 0 * pixelSize, 8 * pixelSize, 2 * pixelSize);
            ctx.fillRect(x + 3 * pixelSize, y + 2 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            ctx.fillRect(x + 11 * pixelSize, y + 2 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            
            // Face (skin) - y: 3-8
            ctx.fillStyle = skinColor;
            ctx.fillRect(x + 3 * pixelSize, y + 3 * pixelSize, 10 * pixelSize, 6 * pixelSize);
            
            // Eyes
            ctx.fillStyle = eyeColor;
            ctx.fillRect(x + 5 * pixelSize, y + 5 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(x + 10 * pixelSize, y + 5 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            
            // Mouth (happy smile)
            ctx.strokeStyle = eyeColor;
            ctx.beginPath();
            ctx.moveTo(x + 6 * pixelSize, y + 7 * pixelSize);
            ctx.quadraticCurveTo(x + 8 * pixelSize, y + 8 * pixelSize, x + 10 * pixelSize, y + 7 * pixelSize);
            ctx.stroke();
            
            // Shirt - y: 9-11
            ctx.fillStyle = shirtColor;
            ctx.fillRect(x + 4 * pixelSize, y + 9 * pixelSize, 8 * pixelSize, 3 * pixelSize);
            
            // Arms (animate when walking - left forward, right back)
            ctx.fillStyle = skinColor;
            if (isWalking) {
                // Left arm forward
                ctx.fillRect(x + 1 * pixelSize, y + 9 * pixelSize, 2 * pixelSize, 3 * pixelSize);
                // Right arm back
                ctx.fillRect(x + 13 * pixelSize, y + 11 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            } else {
                // Standing arms
                ctx.fillRect(x + 2 * pixelSize, y + 10 * pixelSize, 2 * pixelSize, 2 * pixelSize);
                ctx.fillRect(x + 12 * pixelSize, y + 10 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            }
            
            // Pants - y: 12-14 (animate legs when walking)
            ctx.fillStyle = pantsColor;
            if (isWalking) {
                // Left leg forward, right leg back
                ctx.fillRect(x + 4 * pixelSize, y + 11 * pixelSize, 2 * pixelSize, 4 * pixelSize);
                ctx.fillRect(x + 10 * pixelSize, y + 13 * pixelSize, 2 * pixelSize, 3 * pixelSize);
            } else {
                // Standing legs
                ctx.fillRect(x + 5 * pixelSize, y + 12 * pixelSize, 2 * pixelSize, 3 * pixelSize);
                ctx.fillRect(x + 9 * pixelSize, y + 12 * pixelSize, 2 * pixelSize, 3 * pixelSize);
            }
            
            // Shoes (animate position when walking)
            ctx.fillStyle = shoeColor;
            if (isWalking) {
                // Left foot forward
                ctx.fillRect(x + 3 * pixelSize, y + 15 * pixelSize, 4 * pixelSize, 1 * pixelSize);
                // Right foot back
                ctx.fillRect(x + 10 * pixelSize, y + 16 * pixelSize, 3 * pixelSize, 1 * pixelSize);
            } else {
                // Standing feet
                ctx.fillRect(x + 4 * pixelSize, y + 15 * pixelSize, 4 * pixelSize, 1 * pixelSize);
                ctx.fillRect(x + 8 * pixelSize, y + 15 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            }
            
            // Reset smoothing
            ctx.imageSmoothingEnabled = true;
        }
        
        // Function to draw a miner NPC
        function drawMiner(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
            const pixelSize = size / 16;
            ctx.imageSmoothingEnabled = false;
            
            // Colors
            const helmetColor = '#FFA500';
            const visorColor = '#000000';
            const skinColor = '#FFDBAC';
            const pickColor = '#808080';
            const bodyColor = '#4A4A4A';
            const pantsColor = '#654321';
            const shoeColor = '#000000';
            
            // Helmet - y: 0-4
            ctx.fillStyle = helmetColor;
            ctx.fillRect(x + 3 * pixelSize, y + 0 * pixelSize, 10 * pixelSize, 4 * pixelSize);
            // Visor
            ctx.fillStyle = visorColor;
            ctx.fillRect(x + 5 * pixelSize, y + 2 * pixelSize, 6 * pixelSize, 2 * pixelSize);
            
            // Face (visible through visor)
            ctx.fillStyle = skinColor;
            ctx.fillRect(x + 6 * pixelSize, y + 2 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            
            // Beard
            ctx.fillStyle = '#2F2F2F';
            ctx.fillRect(x + 4 * pixelSize, y + 3 * pixelSize, 8 * pixelSize, 2 * pixelSize);
            
            // Body - y: 5-10
            ctx.fillStyle = bodyColor;
            ctx.fillRect(x + 4 * pixelSize, y + 5 * pixelSize, 8 * pixelSize, 6 * pixelSize);
            
            // Arms
            ctx.fillStyle = skinColor;
            ctx.fillRect(x + 2 * pixelSize, y + 6 * pixelSize, 2 * pixelSize, 3 * pixelSize);
            ctx.fillRect(x + 12 * pixelSize, y + 6 * pixelSize, 2 * pixelSize, 3 * pixelSize);
            
            // Pickaxe in right hand
            ctx.strokeStyle = pickColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Handle
            ctx.moveTo(x + 13 * pixelSize, y + 7 * pixelSize);
            ctx.lineTo(x + 15 * pixelSize, y + 5 * pixelSize);
            ctx.stroke();
            // Pick head
            ctx.fillStyle = pickColor;
            ctx.fillRect(x + 14 * pixelSize, y + 4 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            
            // Pants - y: 11-13
            ctx.fillStyle = pantsColor;
            ctx.fillRect(x + 5 * pixelSize, y + 11 * pixelSize, 2 * pixelSize, 3 * pixelSize);
            ctx.fillRect(x + 9 * pixelSize, y + 11 * pixelSize, 2 * pixelSize, 3 * pixelSize);
            
            // Shoes - y: 14-15
            ctx.fillStyle = shoeColor;
            ctx.fillRect(x + 4 * pixelSize, y + 14 * pixelSize, 4 * pixelSize, 2 * pixelSize);
            ctx.fillRect(x + 8 * pixelSize, y + 14 * pixelSize, 4 * pixelSize, 2 * pixelSize);
            
            ctx.imageSmoothingEnabled = true;
        }
        
        // Function to draw a wizard NPC
        function drawWizard(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
            const pixelSize = size / 16;
            ctx.imageSmoothingEnabled = false;
            
            // Colors
            const hatColor = '#8B00FF';
            const starColor = '#FFD700';
            const skinColor = '#FFDBAC';
            const beardColor = '#FFFFFF';
            const robeColor = '#4B0082';
            const staffColor = '#8B4513';
            const crystalColor = '#00BFFF';
            
            // Hat - y: 0-6
            ctx.fillStyle = hatColor;
            ctx.fillRect(x + 2 * pixelSize, y + 0 * pixelSize, 12 * pixelSize, 6 * pixelSize);
            // Hat point
            ctx.fillRect(x + 7 * pixelSize, y + 0 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            // Star on hat
            ctx.fillStyle = starColor;
            ctx.fillRect(x + 7 * pixelSize, y + 2 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            
            // Face - y: 4-7
            ctx.fillStyle = skinColor;
            ctx.fillRect(x + 3 * pixelSize, y + 4 * pixelSize, 10 * pixelSize, 4 * pixelSize);
            
            // Eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 5 * pixelSize, y + 6 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(x + 10 * pixelSize, y + 6 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            
            // Long beard
            ctx.fillStyle = beardColor;
            ctx.fillRect(x + 4 * pixelSize, y + 7 * pixelSize, 8 * pixelSize, 5 * pixelSize);
            
            // Robe - y: 8-14
            ctx.fillStyle = robeColor;
            ctx.fillRect(x + 3 * pixelSize, y + 8 * pixelSize, 10 * pixelSize, 7 * pixelSize);
            
            // Arms
            ctx.fillStyle = skinColor;
            ctx.fillRect(x + 2 * pixelSize, y + 9 * pixelSize, 1 * pixelSize, 2 * pixelSize);
            ctx.fillRect(x + 13 * pixelSize, y + 9 * pixelSize, 1 * pixelSize, 2 * pixelSize);
            
            // Staff in right hand
            ctx.fillStyle = staffColor;
            ctx.fillRect(x + 13 * pixelSize, y + 7 * pixelSize, 1 * pixelSize, 8 * pixelSize);
            // Crystal on staff
            ctx.fillStyle = crystalColor;
            ctx.fillRect(x + 12 * pixelSize, y + 7 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            
            // Shoes - y: 15
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 5 * pixelSize, y + 15 * pixelSize, 6 * pixelSize, 1 * pixelSize);
            
            ctx.imageSmoothingEnabled = true;
        }
        
        // Function to draw a speech bubble
        function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string) {
            ctx.imageSmoothingEnabled = false;
            
            const bubbleColor = '#FFFFFF';
            const outlineColor = '#000000';
            
            // Main bubble body
            ctx.fillStyle = bubbleColor;
            ctx.fillRect(x, y, width, height);
            
            // Outline
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            
            // Pointer/tail pointing down
            ctx.beginPath();
            ctx.moveTo(x + 10, y + height);
            ctx.lineTo(x + 20, y + height);
            ctx.lineTo(x + 15, y + height + 10);
            ctx.closePath();
            ctx.fillStyle = bubbleColor;
            ctx.fill();
            ctx.stroke();
            
            // Text
            ctx.fillStyle = '#000000';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(text, x + 10, y + 10);
            
            ctx.imageSmoothingEnabled = true;
        }

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            function gameLoop(time: number) {
                // for consistent movement - also if framerate drops/gets higher
            if (lastTime === 0) lastTime = time; // Initialize on first frame
                const delta = time - lastTime;
                lastTime = time;
            
            // ctx is guaranteed to be non-null due to check at line 11
            if (!ctx) return;

                // Intended movement
                let dx = 0;
                let dy = 0;
            let isMoving = false;
            if (keysPressed.has("arrowright") || keysPressed.has("d")) { dx += speed * delta; isMoving = true; }
            if (keysPressed.has("arrowleft") || keysPressed.has("a")) { dx -= speed * delta; isMoving = true; }
            if (keysPressed.has("arrowdown") || keysPressed.has("s")) { dy += speed * delta; isMoving = true; }
            if (keysPressed.has("arrowup") || keysPressed.has("w")) { dy -= speed * delta; isMoving = true; }
            
            // Update walk cycle animation (slower for smoother look)
            if (isMoving) {
                walkCycle += 0.15; // Increment slowly for smooth animation
                if (walkCycle >= 100) walkCycle = 0; // Reset cycle to prevent overflow
            }

                const nextX = player.x + dx;
                const nextY = player.y + dy;

                // Compute camera offset if player moves
            // const halfW = canvasWidth / 2;
            // const halfH = canvasHeight / 2;
            // const camX = Math.min(Math.max(nextX - halfW, 0), mapWidth - canvasWidth);
            // const camY = Math.min(Math.max(nextY - halfH, 0), mapHeight - canvasHeight);

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

            // Draw player with pixel art
            drawPixelArtCharacter(
                ctx,
                    player.x - cameraOffset.x,
                    player.y - cameraOffset.y,
                    playerSize,
                walkCycle
            );

            // Draw NPCs
            for (const npc of npcs) {
                const npcScreenX = npc.x - cameraOffset.x;
                const npcScreenY = npc.y - cameraOffset.y;
                
                if (npc.type === 'miner') {
                    drawMiner(ctx, npcScreenX, npcScreenY, playerSize);
                } else if (npc.type === 'wizard') {
                    drawWizard(ctx, npcScreenX, npcScreenY, playerSize);
                    // Draw speech bubble above wizard
                    const bubbleX = npcScreenX - 40;
                    const bubbleY = npcScreenY - 40;
                    drawSpeechBubble(ctx, bubbleX, bubbleY, 80, 25, "Hello!");
                }
            }

            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    return (
        <div>
            <h1>Pixel Art Game</h1>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                style={{ border: "1px solid black", background: "#eee" }}
            />
        </div>
    );
}
