export type Npc = { x: number; y: number; type: 'miner' | 'wizard' };

export function useNPCs(): { npcs: Npc[] } {
    // Static for now; could be fetched or generated later
    const npcs: Npc[] = [
        { x: 300, y: 200, type: 'miner' },
        { x: 500, y: 150, type: 'wizard' },
    ];

    return { npcs };
}


