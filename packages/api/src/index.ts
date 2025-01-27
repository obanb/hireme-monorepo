import {Server} from "node:http";
import express from 'express';
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
        res.json({"hello":"from api"});
    })
};

startServer().catch(console.error);
