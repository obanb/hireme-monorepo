import { Server } from "http";
import express from "express";

export type ServerStatus =
    | { isAlive: false; server: undefined }
    | { isAlive: true; server: Server };

let serverStatus: ServerStatus = { isAlive: false, server: undefined };

const app = express();

const startServer = async () => {
    serverStatus = await new Promise<ServerStatus>((resolve) => {
        const httpServer = app.listen(8080, () => {
            console.log(`[server]: Server is running at http://localhost:8080`);
            resolve({ isAlive: true, server: httpServer });
        });
    });

    app.get("/api", (req, res) => {
        res.json({ message: "Hello from the server!" });
    });
};

export const server = {
    startServer,
    serverStatus
};