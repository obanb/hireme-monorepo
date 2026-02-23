import OpenAI from 'openai';
import { config } from '../config';

const whisperClient = new OpenAI({
  apiKey: config.embeddings.apiKey,
});

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

  const response = await whisperClient.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });

  return response.text;
}
