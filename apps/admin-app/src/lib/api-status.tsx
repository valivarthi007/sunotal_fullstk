import React, { createContext, useContext, useEffect, useState } from "react";

type ApiStatusContextType = { available: boolean; retry: () => void };

const ApiStatusContext = createContext<ApiStatusContextType>({ available: true, retry: () => {} });

async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("/api/healthz", { cache: "no-store", signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch (err) {
    return false;
  }
}

export function ApiStatusProvider({ children }: { children: React.ReactNode }) {
  const [available, setAvailable] = useState(true);

  const doCheck = async () => {
    const ok = await checkHealth();
    setAvailable(ok);
  };

  useEffect(() => {
    // initial check
    doCheck();
    // periodic background check
    const t = setInterval(doCheck, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <ApiStatusContext.Provider value={{ available, retry: doCheck }}>
      {children}
      {!available && (
        <div className="fixed top-0 left-0 right-0 z-50 border-b bg-yellow-50 text-yellow-800 px-4 py-3 text-center">
          <span>Backend unavailable — some pages may not load. </span>
          <button
            onClick={doCheck}
            className="ml-3 underline font-semibold"
            aria-label="Retry backend connection"
          >
            Retry
          </button>
        </div>
      )}
    </ApiStatusContext.Provider>
  );
}

export const useApiStatus = () => useContext(ApiStatusContext);
