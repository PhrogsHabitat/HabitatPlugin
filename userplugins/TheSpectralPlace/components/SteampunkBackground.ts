/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ASSETS } from "../utils/Constants";
import { settings } from "../utils/settingsStore";
import { hideLoadingOverlay, showLoadingOverlay } from "./LoadingOverlay";
import * as SteamEffect from "./SteamEffect";
import * as WebGLSteampunkEffect from "./WebGLSteampunkEffect";

export let steampunkBackground: HTMLVideoElement | HTMLImageElement | null = null;
let reloadTimeout: NodeJS.Timeout | null = null;
let appMountObserver: MutationObserver | null = null;

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

function getAssetType(url: string) {
    const lowerUrl = (url || "").toLowerCase();
    if (VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext))) return "video";
    if (IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext))) return "image";
    return "unknown";
}

export async function setup() {
    if (steampunkBackground) return;
    showLoadingOverlay();

    const themeBg = ASSETS?.THEME_BACKGROUND ?? "";
    if (!themeBg) {
        console.warn("SteampunkBackground: THEME_BACKGROUND asset missing, aborting setup");
        hideLoadingOverlay();
        return;
    }
    if (!document?.body) {
        console.warn("SteampunkBackground: document.body not available, aborting setup");
        hideLoadingOverlay();
        return;
    }

    const assetType = getAssetType(themeBg);

    if (assetType === "video") {
        // Video background setup
        steampunkBackground = document.createElement("video");
        const video = steampunkBackground as HTMLVideoElement;
        video.src = themeBg;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.crossOrigin = "anonymous";
        video.playsInline = true;
        video.preload = "auto";

        video.onerror = () => {
            console.error("Video failed to load. Retrying...");
            setTimeout(() => {
                try {
                    video.src = themeBg + "?" + Date.now();
                } catch (e) { /* ignore */ }
            }, 2000);
        };

        // Wait for video to load
        try {
            await new Promise<void>((resolve, reject) => {
                const onCanPlay = () => {
                    video.removeEventListener("canplay", onCanPlay);
                    resolve();
                };

                const onError = (e: Event) => {
                    video.removeEventListener("error", onError);
                    reject(e);
                };

                video.addEventListener("canplay", onCanPlay);
                video.addEventListener("error", onError);
                video.load();
            });
        } catch (e) {
            console.error("Video load promise rejected:", e);
        }

        try {
            await video.play();
        } catch (e) {
            console.error("Video play error:", e);
        }
    } else {
        // Static image background setup
        steampunkBackground = document.createElement("img");
        const img = steampunkBackground as HTMLImageElement;
        img.src = themeBg;
        img.crossOrigin = "anonymous";

        // Wait for image to load
        try {
            await new Promise<void>((resolve, reject) => {
                const onLoad = () => {
                    img.removeEventListener("load", onLoad);
                    resolve();
                };

                const onError = (e: Event) => {
                    img.removeEventListener("error", onError);
                    reject(e);
                };

                img.addEventListener("load", onLoad);
                img.addEventListener("error", onError);
            });
        } catch (e) {
            console.error("Image load promise rejected:", e);
        }
    }

    // Common styles for both video and image
    if (steampunkBackground && steampunkBackground.style) {
        Object.assign(steampunkBackground.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: "-2"
        });
        try {
            document.body.appendChild(steampunkBackground);
        } catch (e) {
            console.error("Failed to append steampunkBackground to document.body:", e);
        }
    }

    // Setup effects
    try {
        WebGLSteampunkEffect.setup();
    } catch (e) {
        console.error("WebGLSteampunkEffect.setup error:", e);
    }
    if (settings && (settings as any).store && (settings as any).store.enableSteam) {
        try {
            SteamEffect.setup();
        } catch (e) {
            console.error("SteamEffect.setup error:", e);
        }
    }
    setupDiscordReloadDetection();

    hideLoadingOverlay();
}

export function remove() {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    if (appMountObserver) appMountObserver.disconnect();

    if (steampunkBackground) {
        // Only pause if it's a video
        if (steampunkBackground instanceof HTMLVideoElement) {
            steampunkBackground.pause();
        }

        if (steampunkBackground.parentNode) {
            steampunkBackground.parentNode.removeChild(steampunkBackground);
        }
        steampunkBackground = null;
    }

    WebGLSteampunkEffect.cleanup();
    SteamEffect.remove();
}

function setupDiscordReloadDetection() {
    if (appMountObserver) appMountObserver.disconnect();

    if (!document?.body) {
        // nothing to observe in non-browser-like environment
        return;
    }

    appMountObserver = new MutationObserver(() => {
        if (!document.getElementById("app-mount")) {
            showLoadingOverlay();
            remove();
            reloadTimeout = setTimeout(() => {
                if (settings && (settings as any).store && (settings as any).store.showSteampunkBackground) setup();
            }, 4000);
        }
    });

    appMountObserver.observe(document.body, { childList: true, subtree: true });
}
