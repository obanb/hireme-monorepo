'use client';

// This is a Next.js client component for our pixel art game
import { useEffect, useRef } from "react";
import { useControls } from "../../hooks/useControls";  // Hook for keyboard input
import { useNPCs } from "../../hooks/useNPCs";           // Hook for NPC data
import { useCharacters } from "../../hooks/useCharacters"; // Hook for drawing character sprites
import { useGameState } from "../../hooks/useGameState";  // Hook for game state management

export default function NpcCameraGame() {
    // Reference to the canvas HTML element where we draw the game
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Get keyboard input state - tracks which keys are currently pressed
    const { keysRef } = useControls();
    
    // Player sprite size in pixels (64x64)
    const playerSize = 64;
    
    // Get all game state: player position, timing, map dimensions, obstacles, etc.
    const { playerRef, lastTimeRef, walkCycleRef, mapWidth, mapHeight, gridSize, obstacles, willCollide } = useGameState(playerSize);
    
    // Get NPCs array (miner and wizard)
    const { npcs } = useNPCs();
    
    // Get drawing functions for different characters
    const { drawPlayer, drawMiner, drawWizard, drawSpeechBubble } = useCharacters();

    // useEffect runs when component mounts and sets up the game
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");  // Get 2D drawing context
        
        // Early exit if canvas not ready
        if (!canvas || !ctx) return;

        // Movement speed multiplier (pixels per millisecond)
        const speed = 0.2;

        // Main game loop - runs every frame (~60fps)
        function gameLoop(time: number) {
            // Initialize lastTime on first frame to calculate delta
            if (lastTimeRef.current === 0) lastTimeRef.current = time;
            
            // Calculate time difference since last frame (for smooth movement regardless of framerate)
            const delta = time - lastTimeRef.current;
            lastTimeRef.current = time;
            
            if (!ctx) return;

            // Movement direction variables (dx = delta x, dy = delta y)
            let dx = 0;
            let dy = 0;
            let isMoving = false;
            
            // Check which keys are currently pressed and calculate movement
            const keysPressed = keysRef.current;
            if (keysPressed.has("arrowright") || keysPressed.has("d")) { dx += speed * delta; isMoving = true; }
            if (keysPressed.has("arrowleft") || keysPressed.has("a")) { dx -= speed * delta; isMoving = true; }
            if (keysPressed.has("arrowdown") || keysPressed.has("s")) { dy += speed * delta; isMoving = true; }
            if (keysPressed.has("arrowup") || keysPressed.has("w")) { dy -= speed * delta; isMoving = true; }
            
            // Update walking animation cycle if moving (increments slowly for smooth animation)
            if (isMoving) {
                walkCycleRef.current += 0.15;
                if (walkCycleRef.current >= 100) walkCycleRef.current  = 0; // Reset to prevent overflow
            }

            // Calculate where player wants to move next
            const nextX = playerRef.current.x + dx;
            const nextY = playerRef.current.y + dy;

            if (!willCollide(nextX, playerRef.current.y)) {
                playerRef.current.x = nextX;
            }
            if (!willCollide(playerRef.current.x, nextY)) {
                playerRef.current.y = nextY;
            }

            playerRef.current.x = Math.max(0, Math.min(mapWidth - playerSize, playerRef.current.x));
            playerRef.current.y = Math.max(0, Math.min(mapHeight - playerSize, playerRef.current.y));

            if (!canvas) return;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            const cameraOffset = {
                x: Math.min(Math.max(playerRef.current.x - canvasWidth / 2, 0), mapWidth - canvasWidth),
                y: Math.min(Math.max(playerRef.current.y - canvasHeight / 2, 0), mapHeight - canvasHeight),
            };

            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            ctx.fillStyle = "#e0ffe0";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            const startX = Math.floor(cameraOffset.x / gridSize) * gridSize;
            const endX = Math.ceil((cameraOffset.x + canvasWidth) / gridSize) * gridSize;
            const startY = Math.floor(cameraOffset.y / gridSize) * gridSize;
            const endY = Math.ceil((cameraOffset.y + canvasHeight) / gridSize) * gridSize;

            ctx.strokeStyle = "#c0c0c0";
            for (let x = startX; x <= endX; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x - cameraOffset.x, 0);
                ctx.lineTo(x - cameraOffset.x, canvas.height);
                ctx.stroke();
            }
            for (let y = startY; y <= endY; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y - cameraOffset.y);
                ctx.lineTo(canvas.width, y - cameraOffset.y);
                ctx.stroke();
            }

            for (const obj of obstacles) {
                ctx.fillStyle = "#228B22";
                ctx.fillRect(
                    obj.x - cameraOffset.x,
                    obj.y - cameraOffset.y,
                    obj.width,
                    obj.height
                );
            }

            drawPlayer(
                ctx,
                playerRef.current.x - cameraOffset.x,
                playerRef.current.y - cameraOffset.y,
                playerSize,
                walkCycleRef.current
            );

            for (const npc of npcs) {
                const npcScreenX = npc.x - cameraOffset.x;
                const npcScreenY = npc.y - cameraOffset.y;
                
                if (npc.type === 'miner') {
                    drawMiner(ctx, npcScreenX, npcScreenY, playerSize);
                } else if (npc.type === 'wizard') {
                    drawWizard(ctx, npcScreenX, npcScreenY, playerSize);
                    const bubbleX = npcScreenX - 40;
                    const bubbleY = npcScreenY - 40;
                    drawSpeechBubble(ctx, bubbleX, bubbleY, 80, 25, "Hello!");
                }
            }

            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);

        return () => {};
    }, [drawPlayer, drawMiner, drawWizard, drawSpeechBubble, gridSize, keysRef, lastTimeRef, mapHeight, mapWidth, npcs, obstacles, playerRef, playerSize, walkCycleRef, willCollide]);

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
