import { useRef } from "react";

export type PlayerState = { x: number; y: number };

export function useGameState(playerSize: number) {
    const playerRef = useRef<PlayerState>({ x: 100, y: 100 });
    const lastTimeRef = useRef<number>(0);
    const walkCycleRef = useRef<number>(0);

    const mapWidth = 2000;
    const mapHeight = 2000;
    const gridSize = 100;
    const obstacles = [{ x: 400, y: 300, width: 64, height: 64 }];

    function isColliding(
        ax: number,
        ay: number,
        aw: number,
        ah: number,
        bx: number,
        by: number,
        bw: number,
        bh: number
    ): boolean {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function willCollide(nextX: number, nextY: number): boolean {
        return obstacles.some((obj) =>
            isColliding(nextX, nextY, playerSize, playerSize, obj.x, obj.y, obj.width, obj.height)
        );
    }

    return {
        playerRef,
        lastTimeRef,
        walkCycleRef,
        mapWidth,
        mapHeight,
        gridSize,
        obstacles,
        willCollide,
    } as const;
}


