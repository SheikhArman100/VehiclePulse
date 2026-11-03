"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { VehicleRealtimeState } from "@/types/api";

export interface WebSocketMessage {
  type: "SUBSCRIBED" | "UNSUBSCRIBED" | "PONG" | "SNAPSHOT" | "STATE_UPDATE" | "HEARTBEAT" | "ERROR";
  channel?: string;
  vehicleId?: string;
  data?: unknown;
  timestamp?: string;
  message?: string;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  subscribe: (vehicleId: string) => void;
  unsubscribe: (vehicleId: string) => void;
  requestSnapshot: (vehicleId: string) => void;
  vehicleStates: Record<string, VehicleRealtimeState>;
}

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost/ws";

/**
 * Custom React hook for connecting to the VehiclePulse Redis Pub/Sub WebSocket stream.
 */
export function useVehicleWebSocket(subscribedVehicleIds: string[] = []): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [vehicleStates, setVehicleStates] = useState<Record<string, VehicleRealtimeState>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const subscribe = useCallback((vehicleId: string) => {
    sendMessage({ action: "SUBSCRIBE", vehicleId });
  }, [sendMessage]);

  const unsubscribe = useCallback((vehicleId: string) => {
    sendMessage({ action: "UNSUBSCRIBE", vehicleId });
  }, [sendMessage]);

  const requestSnapshot = useCallback((vehicleId: string) => {
    sendMessage({ action: "SNAPSHOT", vehicleId });
  }, [sendMessage]);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          // Auto-subscribe to provided vehicle IDs upon connection
          for (const vid of subscribedVehicleIds) {
            ws.send(JSON.stringify({ action: "SUBSCRIBE", vehicleId: vid }));
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(event.data) as WebSocketMessage;
            setLastMessage(parsed);

            if ((parsed.type === "STATE_UPDATE" || parsed.type === "SNAPSHOT") && parsed.vehicleId && parsed.data) {
              setVehicleStates((prev) => ({
                ...prev,
                [parsed.vehicleId as string]: parsed.data as VehicleRealtimeState,
              }));
            }
          } catch {
            // Ignore non-JSON or heartbeat pings
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Exponential / fixed backoff reconnect
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch {
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [subscribedVehicleIds]);

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    requestSnapshot,
    vehicleStates,
  };
}

