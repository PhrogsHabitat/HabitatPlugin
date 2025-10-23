/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Define the compile-time boolean symbol to be replaced by the bundler.
declare const IS_REDIRECT_CSS: boolean;

let habitatStyle: HTMLStyleElement | null = null;

import { ASSETS } from "./Constants";
// Note: DO NOT static-import HabitatRainCss here — import it dynamically only when needed.
// import habitatRainCss from "./HabitatRainCss";

const HABITAT_CSS_URL = ASSETS.THEME_CSS;

export async function injectHabitatStyles() {
    if (habitatStyle) return;

    // If build-time flag is true, dynamically import the local CSS module and inject it.
    if (typeof IS_REDIRECT_CSS !== "undefined" && IS_REDIRECT_CSS === true) {
        try {
            const mod = await import("./HabitatRainCss");
            const habitatRainCss = mod?.default ?? (mod as any).habitatRainCss ?? null;
            if (typeof habitatRainCss === "string") {
                const style = document.createElement("style");
                style.id = "stylesPHROGSHABITAT";
                style.textContent = habitatRainCss;
                document.head.appendChild(style);
                habitatStyle = style;
                return;
            } else {
                console.warn("redirect CSS requested but HabitatRainCss did not export a string.");
            }
        } catch (e) {
            console.error("Failed to load local HabitatRainCss:", e);
            // Fall through to fetch remote CSS if dynamic import fails
        }
    }

    // Helper to fetch and inject a style
    async function fetchAndInject(url: string, id: string): Promise<HTMLStyleElement | null> {
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Failed to fetch CSS from ${url}`);
            const css = await resp.text();
            const style = document.createElement("style");
            style.id = id;
            style.textContent = css;
            document.head.appendChild(style);
            return style;
        } catch (e) {
            console.error(`Error loading CSS from ${url}:`, e);
            return null;
        }
    }

    habitatStyle = await fetchAndInject(HABITAT_CSS_URL, "stylesPHROGSHABITAT");
}

export function removeHabitatStyles() {
    if (habitatStyle?.parentNode) {
        habitatStyle.parentNode.removeChild(habitatStyle);
        habitatStyle = null;
    }
}
