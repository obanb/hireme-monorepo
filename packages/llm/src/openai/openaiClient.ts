import OpenAI from "openai";

const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
});

export const openai = openaiClient;