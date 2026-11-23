import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/outfit/latin-500.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/sora/latin-700.css";
import App from "./App.jsx";
import brandIcon from "./assets/logo.png";
import "./styles.css";
import "./react-support.css";

document.querySelector('link[rel="icon"]').href = brandIcon;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
