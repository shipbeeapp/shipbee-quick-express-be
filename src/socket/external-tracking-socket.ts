import WebSocket from "ws";
import { env } from "../config/environment.js"; // Assuming you have an environment config

class ExternalTrackingSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect() {
    const wsUrl = `${env.EXTERNAL_TRACKING_SOCKET.URL}?token=${env.EXTERNAL_TRACKING_SOCKET.TOKEN}`
    console.log(wsUrl)
    this.ws = new WebSocket(wsUrl);

    this.ws.on("open", () => {
      console.log("Connected to external tracking WebSocket");
    });

    this.ws.on("close", () => {
      console.warn("WebSocket closed. Reconnecting...");
      this.reconnect();
    });

    this.ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      this.ws?.close();
    });
  }

  reconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("sending data to ansar websocket")
      console.log(data)
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const externalTrackingSocket = new ExternalTrackingSocket();
