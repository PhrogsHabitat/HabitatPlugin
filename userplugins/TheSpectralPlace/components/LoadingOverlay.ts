/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let loadingOverlay: HTMLDivElement | null = null;

export function showLoadingOverlay() {
    if (loadingOverlay) return;

    loadingOverlay = document.createElement("div");
    loadingOverlay.id = "habitat-loading-overlay";
    loadingOverlay.style.position = "fixed";
    loadingOverlay.style.top = "0";
    loadingOverlay.style.left = "0";
    loadingOverlay.style.width = "100vw";
    loadingOverlay.style.height = "100vh";
    loadingOverlay.style.zIndex = "9999";
    loadingOverlay.style.background = "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.8) 100%)";
    loadingOverlay.style.backdropFilter = "blur(10px)";
    loadingOverlay.style.display = "flex";
    loadingOverlay.style.justifyContent = "center";
    loadingOverlay.style.alignItems = "center";
    loadingOverlay.style.color = "white";
    loadingOverlay.style.fontSize = "24px";
    loadingOverlay.style.fontFamily = "var(--font-primary)";
    loadingOverlay.textContent = "Loading Habitat Rain...";

    document.body.appendChild(loadingOverlay);
}

export function hideLoadingOverlay() {
    if (loadingOverlay) {
        // Fade out animation
        loadingOverlay.style.transition = "opacity 0.5s ease";
        loadingOverlay.style.opacity = "0";
        setTimeout(() => {
            if (loadingOverlay?.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }
            loadingOverlay = null;
        }, 500);
    }
}
