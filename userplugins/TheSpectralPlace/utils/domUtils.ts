/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let habitatStyle: HTMLStyleElement | null = null;

import { ASSETS } from "./Constants";
import habitatRainCss from "./SpectralPlaceCss";
// @ts-ignore: This will be replaced at build time if needed

const HABITAT_CSS_URL = ASSETS.THEME_CSS;

export async function injectHabitatStyles() {
    // Prevent duplicate injection
    if (habitatStyle) return;

    // Use the esbuild define directly (replaced at build time)
    // @ts-expect-error: IS_REDIRECT_CSS is injected at build time
    if (IS_REDIRECT_CSS && typeof habitatRainCss === "string") {
        // Use local CSS string from HabitatRainCss.ts
        const style = document.createElement("style");
        style.id = "stylesPHROGSHABITAT";
        style.textContent = habitatRainCss;
        document.head.appendChild(style);
        habitatStyle = style;
        return;
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
