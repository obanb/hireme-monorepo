import {Socket} from "socket.io";

export const wsService = () => {
    const wsClients: Map<string, Socket> = new Map();

    const auth = (socket: Socket) => {
        const params = socket.handshake.auth
        const userId = params.userId as string;

    }

    const addClient = (userId: string, socket: Socket) => {
        if (!wsClients.has(userId)) {
            wsClients.set(userId, socket);
        }
        wsClients.get(userId)?.disconnect();
    }

    const removeClient = (userId: string) => {
        wsClients.get(userId)?.disconnect();
        wsClients.delete(userId);
    }

    return {
        addClient,
        removeClient,
    }
}

export type WsService = ReturnType<typeof wsService>;

