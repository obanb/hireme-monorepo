import OpenAI from "openai";
import { config } from "../config";

const openaiClient = new OpenAI({
    baseURL: config.llm.baseUrl,
    apiKey: config.llm.apiKey,
});

export const openai = openaiClient;
