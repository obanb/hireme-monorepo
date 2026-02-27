# Web Search Integration (Tavily)

The AI chat assistant can search the internet in real time via the Tavily API. This allows staff (and guests) to ask questions that go beyond the hotel's own data — local events, attractions, weather, transport connections, restaurants nearby, ski conditions, etc.

---

## Architecture

Web search is exposed as a standard MCP tool (`web_search`). The LLM decides autonomously when to use it based on the question — it uses hotel data tools for internal questions and `web_search` for anything requiring live external information.

```
User question
     │
     ▼
LLM (OpenAI-compatible, requesty.ai)
     │ detects external-info question
     ▼
web_search MCP tool
     │
     ▼
Tavily Search API  ──►  returns title + URL + snippet per result
     │
     ▼
LLM synthesises a natural-language answer
     │
     ▼
Streamed back to chat UI (with tool-call badge)
```

The entire flow is handled by the existing tool-call loop in `packages/llm/src/chat/service.ts` — no extra code was needed there.

---

## Files Changed

| File | Change |
|------|--------|
| `packages/mcp/src/server.ts` | Added `web_search` tool (~35 lines) |
| `packages/mcp/package.json` | Added `@tavily/core` dependency |
| `packages/llm/src/chat/prompts.ts` | Updated system prompt — when to use web search vs hotel tools |
| `packages/llm/.env` | Added `TAVILY_API_KEY` placeholder |

---

## The Tool

```typescript
server.tool(
  'web_search',
  'Search the internet for real-time information...',
  {
    query: z.string(),
    maxResults: z.number().optional(),   // default 5, max 10
  },
  async ({ query, maxResults = 5 }) => {
    const response = await tavilyClient.search(query, {
      maxResults: Math.min(maxResults, 10),
      searchDepth: 'basic',
    });
    const results = response.results.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      relevance: r.score,
    }));
    return { content: [{ type: 'text', text: JSON.stringify(results) }] };
  }
);
```

The Tavily client is initialised once at server startup. If `TAVILY_API_KEY` is not set, the tool returns a clear error message rather than crashing.

---

## System Prompt Guidance

The LLM is instructed to use `web_search` for:

- Local events, concerts, festivals, cultural programs near the hotel
- Tourist attractions, hiking trails, ski conditions in the Harrachov / Krkonoše area
- Restaurant and activity recommendations
- Weather forecasts
- Travel info and transport connections
- Any question a guest might ask about the surrounding area

It is explicitly told **not** to use `web_search` for questions answerable from hotel data (reservations, rooms, guests, etc.).

---

## Environment Variable

`TAVILY_API_KEY` lives in `packages/llm/.env`. Because the MCP server is spawned as a child process by the LLM service (`StdioClientTransport`), it inherits the parent's `process.env` automatically — no separate `.env` file is needed in `packages/mcp`.

```
# packages/llm/.env
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxx
```

Get a free API key at https://app.tavily.com (1 000 searches/month on the free tier).

---

## Example Interactions

| User question | Tool called | Behaviour |
|---|---|---|
| "Are there any cultural events near Harrachov this weekend?" | `web_search` | Searches "cultural events Harrachov weekend", summarises results |
| "What ski runs are open at Harrachov today?" | `web_search` | Searches "Harrachov ski runs open today", returns snow report |
| "Show me tomorrow's reservations" | `get_reservations` | Uses hotel data — no web search |
| "Is there a good restaurant near the hotel?" | `web_search` | Searches "restaurants near Harrachov hotel" |
| "What's the weather forecast for this week?" | `web_search` | Searches "Harrachov weather forecast" |

---

## Graceful Degradation

If `TAVILY_API_KEY` is missing or empty, the tool returns:

```json
{ "error": "Web search is not configured. Set TAVILY_API_KEY in packages/llm/.env to enable it." }
```

The LLM will relay this message to the user rather than producing a silent failure. All other tools (hotel data, navigation) continue working normally.
