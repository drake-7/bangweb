import { useMemo, useRef } from "react";
import Env from "../Model/Env";
import { useSetRef } from "../Utils/UseMapRef";
import { ClientMessage } from "./ClientMessage";
import { ServerMessage } from "./ServerMessage";

export type MessageHandler = {
    [K in ServerMessage as keyof K]?: (message: K[keyof K]) => void;
};

export interface MessageHandlerSet {
    addHandler: (handler: MessageHandler) => void;
    removeHandler: (handler: MessageHandler) => void;
    processMessage: (message: ServerMessage) => void;
}

export interface Connection {
    addHandler: (handler: MessageHandler) => void;
    removeHandler: (handler: MessageHandler) => void;
    isConnected: () => boolean;
    connect: () => void;
    disconnect: () => void;
    sendMessage: (message: ClientMessage) => void;
}

function getServerUrl(): string {
    return Env.bangServerUrl ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/server`;
}

export function useMessageHandlerSet(): MessageHandlerSet {
    const handlers = useSetRef<MessageHandler>();

    return useMemo(() => ({
        addHandler: handlers.add,
        removeHandler: handlers.delete,
        processMessage: message => {
            const [messageType, messageValue] = Object.entries(message)[0];
            handlers.forEach(handler => {
                if (messageType in handler) {
                    const fn = handler[messageType as keyof typeof handler];
                    (fn as (message: unknown) => void)(messageValue);
                }
            });
        }
    }) as const, [handlers]);
}

interface SocketConnectionState {
    socket: WebSocket;
    queuedMessages: ServerMessage[];
}

export function useSocketConnection(): Connection {
    const state = useRef<SocketConnectionState>();
    const messageHandlers = useMessageHandlerSet();

    return useMemo(() => {
        const isConnected = () => state.current !== undefined;

        const connect = () => {
            const socket = new WebSocket(getServerUrl());
            socket.onmessage = (event) => {
                receiveMessage(JSON.parse(event.data));
            };
            socket.onopen = () => {
                console.log('WebSocket connection established');
                receiveMessage({ connected: {}});
            };
            socket.onclose = () => {
                console.log('WebSocket connection closed');
                receiveMessage({ disconnected: {}});
                state.current = undefined;
            };
            socket.onerror = () => {
                console.log('WebSocket connection error');
                receiveMessage({ disconnected: {}});
                state.current = undefined;
            };
            state.current = {
                socket,
                queuedMessages: []
            };
        };

        const disconnect = () => state.current?.socket.close();

        const sendMessage = (message: ClientMessage) => {
            if (state.current?.socket.readyState === WebSocket.OPEN) {
                state.current.socket.send(JSON.stringify(message));
            }
        };

        const receiveMessage = (message: ServerMessage) => {
            if (state.current) {
                state.current.queuedMessages.push(message);
                processMessages();
            }
        };

        const processMessages = () => {
            if (state.current) {
                for (const message of state.current.queuedMessages) {
                    messageHandlers.processMessage(message);
                }
                state.current.queuedMessages = [];
            }
        };
    
        return {...messageHandlers, isConnected, connect, disconnect, sendMessage } as const;
    }, [messageHandlers]);
}


