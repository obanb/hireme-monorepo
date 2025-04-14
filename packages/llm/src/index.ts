import {Server} from "node:http";
import express from 'express';
import ollama from 'ollama';
import {exportTest} from "common";

const port = process.env.PORT || 8080;

const app = express();

export const startServer = async () => {
    await new Promise<Server>((resolve) => {
        const httpServer = app.listen(port, () => {
            console.log(`[server]: Server is running at http://localhost:${port}`);
            resolve(httpServer);
        });
    });

    console.log(exportTest())


    app.use(express.json({ limit: '1mb' }));

    app.get('/hello', (req, res) => {
        res.json({"hello":"from llm"});
    })

    app.post('/query', async(req, res) => {
        const { query } = req.body;
        try {
            const response = await ollama.chat({
                model: 'gemma3:1b',
                messages: [{ role: 'user', content: query }],
                "format": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string"
                        },
                        "capital": {
                            "type": "string"
                        },
                        "languages": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    },
                    "required": [
                        "name",
                        "capital",
                        "languages"
                    ]
                },
                tools:[{
                    'type': 'function',
                    'function': {
                        'name': 'get_current_weather',
                        'description': 'Get the current weather for a city',
                        'parameters': {
                            'type': 'object',
                            'properties': {
                                'city': {
                                    'type': 'string',
                                    'description': 'The name of the city',
                                },
                            },
                            'required': ['city'],
                        },
                    },
                },
                ],
            });

            console.log(res)

            res.json({ reply: response.message.content });
        } catch (error) {
            res.status(500).send({ error: 'Error interacting with the model' });
        }
    })

};

startServer().catch(console.error);
