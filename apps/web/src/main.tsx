/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./styles.css";
import { App } from "./App";
import { bootstrap } from "./bootstrap";

registerSW({ immediate: true });

bootstrap()
    .then((container) => {
        createRoot(document.getElementById("root")!).render(
            <StrictMode>
                <App container={container} />
            </StrictMode>,
        );
    })
    .catch((error: unknown) => {
        const root = document.getElementById("root");
        if (root) {
            root.innerHTML = `<pre style="padding:2rem;color:#c00;white-space:pre-wrap"></pre>`;
            (root.firstElementChild as HTMLElement).textContent =
                `Noml failed to start:\n\n${String(error)}`;
        }
    });
