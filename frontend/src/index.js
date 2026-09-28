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
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
