export type DrawCharacterFn = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    cycle?: number
) => void;

export function useCharacters(): {
    drawPlayer: DrawCharacterFn;
    drawMiner: DrawCharacterFn;
    drawWizard: DrawCharacterFn;
    drawSpeechBubble: (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        text: string
    ) => void;
} {
    function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, cycle: number = 0) {
        const pixelSize = size / 16;
        ctx.imageSmoothingEnabled = false;

        const skinColor = '#FFDBAC';
        const hairColor = '#8B4513';
        const shirtColor = '#4A90E2';
        const pantsColor = '#654321';
        const shoeColor = '#000000';
        const eyeColor = '#000000';

        const isWalking = Math.floor(cycle) % 2 === 1;

        ctx.fillStyle = hairColor;
        ctx.fillRect(x + 4 * pixelSize, y + 0 * pixelSize, 8 * pixelSize, 2 * pixelSize);
        ctx.fillRect(x + 3 * pixelSize, y + 2 * pixelSize, 2 * pixelSize, 1 * pixelSize);
        ctx.fillRect(x + 11 * pixelSize, y + 2 * pixelSize, 2 * pixelSize, 1 * pixelSize);

        ctx.fillStyle = skinColor;
        ctx.fillRect(x + 3 * pixelSize, y + 3 * pixelSize, 10 * pixelSize, 6 * pixelSize);

        ctx.fillStyle = eyeColor;
        ctx.fillRect(x + 5 * pixelSize, y + 5 * pixelSize, 1 * pixelSize, 1 * pixelSize);
        ctx.fillRect(x + 10 * pixelSize, y + 5 * pixelSize, 1 * pixelSize, 1 * pixelSize);

        ctx.strokeStyle = eyeColor;
        ctx.beginPath();
        ctx.moveTo(x + 6 * pixelSize, y + 7 * pixelSize);
        ctx.quadraticCurveTo(x + 8 * pixelSize, y + 8 * pixelSize, x + 10 * pixelSize, y + 7 * pixelSize);
        ctx.stroke();

        ctx.fillStyle = shirtColor;
        ctx.fillRect(x + 4 * pixelSize, y + 9 * pixelSize, 8 * pixelSize, 3 * pixelSize);

        ctx.fillStyle = skinColor;
        if (isWalking) {
            ctx.fillRect(x + 1 * pixelSize, y + 9 * pixelSize, 2 * pixelSize, 3 * pixelSize);
            ctx.fillRect(x + 13 * pixelSize, y + 11 * pixelSize, 2 * pixelSize, 2 * pixelSize);
        } else {
            ctx.fillRect(x + 2 * pixelSize, y + 10 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            ctx.fillRect(x + 12 * pixelSize, y + 10 * pixelSize, 2 * pixelSize, 2 * pixelSize);
        }

        ctx.fillStyle = pantsColor;
        if (isWalking) {
            ctx.fillRect(x + 4 * pixelSize, y + 11 * pixelSize, 2 * pixelSize, 4 * pixelSize);
            ctx.fillRect(x + 10 * pixelSize, y + 13 * pixelSize, 2 * pixelSize, 3 * pixelSize);
        } else {
            ctx.fillRect(x + 5 * pixelSize, y + 12 * pixelSize, 2 * pixelSize, 3 * pixelSize);
            ctx.fillRect(x + 9 * pixelSize, y + 12 * pixelSize, 2 * pixelSize, 3 * pixelSize);
        }

        ctx.fillStyle = shoeColor;
        if (isWalking) {
            ctx.fillRect(x + 3 * pixelSize, y + 15 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillRect(x + 10 * pixelSize, y + 16 * pixelSize, 3 * pixelSize, 1 * pixelSize);
        } else {
            ctx.fillRect(x + 4 * pixelSize, y + 15 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillRect(x + 8 * pixelSize, y + 15 * pixelSize, 4 * pixelSize, 1 * pixelSize);
        }

        ctx.imageSmoothingEnabled = true;
    }

    function drawMiner(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        const pixelSize = size / 16;
        ctx.imageSmoothingEnabled = false;
        const helmetColor = '#FFA500';
        const visorColor = '#000000';
        const skinColor = '#FFDBAC';
        const pickColor = '#808080';
        const bodyColor = '#4A4A4A';
        const pantsColor = '#654321';
        const shoeColor = '#000000';
        ctx.fillStyle = helmetColor;
        ctx.fillRect(x + 3 * pixelSize, y + 0 * pixelSize, 10 * pixelSize, 4 * pixelSize);
        ctx.fillStyle = visorColor;
        ctx.fillRect(x + 5 * pixelSize, y + 2 * pixelSize, 6 * pixelSize, 2 * pixelSize);
        ctx.fillStyle = skinColor;
        ctx.fillRect(x + 6 * pixelSize, y + 2 * pixelSize, 4 * pixelSize, 1 * pixelSize);
        ctx.fillStyle = '#2F2F2F';
        ctx.fillRect(x + 4 * pixelSize, y + 3 * pixelSize, 8 * pixelSize, 2 * pixelSize);
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + 4 * pixelSize, y + 5 * pixelSize, 8 * pixelSize, 6 * pixelSize);
        ctx.fillStyle = skinColor;
        ctx.fillRect(x + 2 * pixelSize, y + 6 * pixelSize, 2 * pixelSize, 3 * pixelSize);
        ctx.fillRect(x + 12 * pixelSize, y + 6 * pixelSize, 2 * pixelSize, 3 * pixelSize);
        ctx.strokeStyle = pickColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 13 * pixelSize, y + 7 * pixelSize);
        ctx.lineTo(x + 15 * pixelSize, y + 5 * pixelSize);
        ctx.stroke();
        ctx.fillStyle = pickColor;
        ctx.fillRect(x + 14 * pixelSize, y + 4 * pixelSize, 2 * pixelSize, 2 * pixelSize);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(x + 5 * pixelSize, y + 11 * pixelSize, 2 * pixelSize, 3 * pixelSize);
        ctx.fillRect(x + 9 * pixelSize, y + 11 * pixelSize, 2 * pixelSize, 3 * pixelSize);
        ctx.fillStyle = shoeColor;
        ctx.fillRect(x + 4 * pixelSize, y + 14 * pixelSize, 4 * pixelSize, 2 * pixelSize);
        ctx.fillRect(x + 8 * pixelSize, y + 14 * pixelSize, 4 * pixelSize, 2 * pixelSize);
        ctx.imageSmoothingEnabled = true;
    }

    function drawWizard(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        const pixelSize = size / 16;
        ctx.imageSmoothingEnabled = false;
        const hatColor = '#8B00FF';
        const starColor = '#FFD700';
        const skinColor = '#FFDBAC';
        const beardColor = '#FFFFFF';
        const robeColor = '#4B0082';
        const staffColor = '#8B4513';
        const crystalColor = '#00BFFF';
        ctx.fillStyle = hatColor;
        ctx.fillRect(x + 2 * pixelSize, y + 0 * pixelSize, 12 * pixelSize, 6 * pixelSize);
        ctx.fillRect(x + 7 * pixelSize, y + 0 * pixelSize, 2 * pixelSize, 2 * pixelSize);
        ctx.fillStyle = starColor;
        ctx.fillRect(x + 7 * pixelSize, y + 2 * pixelSize, 2 * pixelSize, 2 * pixelSize);
        ctx.fillStyle = skinColor;
        ctx.fillRect(x + 3 * pixelSize, y + 4 * pixelSize, 10 * pixelSize, 4 * pixelSize);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 5 * pixelSize, y + 6 * pixelSize, 1 * pixelSize, 1 * pixelSize);
        ctx.fillRect(x + 10 * pixelSize, y + 6 * pixelSize, 1 * pixelSize, 1 * pixelSize);
        ctx.fillStyle = beardColor;
        ctx.fillRect(x + 4 * pixelSize, y + 7 * pixelSize, 8 * pixelSize, 5 * pixelSize);
        ctx.fillStyle = robeColor;
        ctx.fillRect(x + 3 * pixelSize, y + 8 * pixelSize, 10 * pixelSize, 7 * pixelSize);
        ctx.fillStyle = skinColor;
        ctx.fillRect(x + 2 * pixelSize, y + 9 * pixelSize, 1 * pixelSize, 2 * pixelSize);
        ctx.fillRect(x + 13 * pixelSize, y + 9 * pixelSize, 1 * pixelSize, 2 * pixelSize);
        ctx.fillStyle = staffColor;
        ctx.fillRect(x + 13 * pixelSize, y + 7 * pixelSize, 1 * pixelSize, 8 * pixelSize);
        ctx.fillStyle = crystalColor;
        ctx.fillRect(x + 12 * pixelSize, y + 7 * pixelSize, 2 * pixelSize, 2 * pixelSize);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 5 * pixelSize, y + 15 * pixelSize, 6 * pixelSize, 1 * pixelSize);
        ctx.imageSmoothingEnabled = true;
    }

    function drawSpeechBubble(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        text: string
    ) {
        ctx.imageSmoothingEnabled = false;
        const bubbleColor = '#FFFFFF';
        const outlineColor = '#000000';
        ctx.fillStyle = bubbleColor;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.beginPath();
        ctx.moveTo(x + 10, y + height);
        ctx.lineTo(x + 20, y + height);
        ctx.lineTo(x + 15, y + height + 10);
        ctx.closePath();
        ctx.fillStyle = bubbleColor;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000000';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, x + 10, y + 10);
        ctx.imageSmoothingEnabled = true;
    }

    return { drawPlayer, drawMiner, drawWizard, drawSpeechBubble };
}


