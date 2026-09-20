import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeSync(onMutation?: (event: any) => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const streamUrl = isLocal ? "http://localhost:5000/api/realtime/stream" : "https://api.automateuniverse.space/api/realtime/stream";

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        if (eventSource) {
          eventSource.close();
        }
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "REALTIME_MUTATION") {
              queryClient.invalidateQueries();
              if (onMutation) onMutation(payload);
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch {
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries();
    }, 5000);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
    };
  }, [queryClient, onMutation]);
}
