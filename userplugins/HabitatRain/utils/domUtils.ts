/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ASSETS } from "./Constants";

let habitatStyle: HTMLStyleElement | null = null;

const HABITAT_CSS_URL = ASSETS.THEME_CSS;

export async function injectHabitatStyles() {
    // Prevent duplicate injection
    if (habitatStyle) return;

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
