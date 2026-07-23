import React from "react";
import ReactDOM from "react-dom/client";

// Suppress harmless ResizeObserver notification warning (CRA dev overlay false-positive)
const _origErr = window.onerror;
window.addEventListener("error", (e) => {
  if (e?.message?.includes("ResizeObserver loop")) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
