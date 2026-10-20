import React from "react";
import { createRoot } from "react-dom/client";
import App from "../components/tasting/App";
import "../app/globals.css";
const base = new URL(import.meta.env.BASE_URL, window.location.origin).href;
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App
      config={{
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        mapStyle: import.meta.env.VITE_MAP_STYLE_URL || "",
        authRedirectUrl: base,
        requireCloud: true,
      }}
    />
  </React.StrictMode>,
);
