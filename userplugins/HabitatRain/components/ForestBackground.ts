/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ASSETS } from "../utils/Constants";
import { settings } from "../utils/settingsStore";
import { hideLoadingOverlay, showLoadingOverlay } from "./LoadingOverlay";
import * as MistEffect from "./MistEffect";
import * as WebGLRainEffect from "./WebGLRainEffect";

export let forestBackground: HTMLVideoElement | HTMLImageElement | null = null;
let reloadTimeout: NodeJS.Timeout | null = null;
let appMountObserver: MutationObserver | null = null;

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

function getAssetType(url: string) {
    const lowerUrl = url.toLowerCase();
    if (VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext))) return "video";
    if (IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext))) return "image";
    return "unknown";
}

export async function setup() {
    if (forestBackground) return;
    showLoadingOverlay();

    const assetType = getAssetType(ASSETS.THEME_BACKGROUND);

    if (assetType === "video") {
        // Video background setup
        forestBackground = document.createElement("video");
        forestBackground.src = ASSETS.THEME_BACKGROUND;
        forestBackground.autoplay = true;
        forestBackground.loop = true;
        forestBackground.muted = true;
        forestBackground.crossOrigin = "anonymous";
        forestBackground.playsInline = true;
        forestBackground.preload = "auto";

        forestBackground.onerror = () => {
            console.error("Video failed to load. Retrying...");
            setTimeout(() => {
                if (forestBackground && "src" in forestBackground) {
                    forestBackground.src = ASSETS.THEME_BACKGROUND + "?" + Date.now();
                }
            }, 2000);
        };

        // Wait for video to load
        await new Promise<void>((resolve, reject) => {
            const onCanPlay = () => {
                forestBackground?.removeEventListener("canplay", onCanPlay);
                resolve();
            };

            const onError = (e: Event) => {
                forestBackground?.removeEventListener("error", onError);
                reject(e);
            };

            forestBackground.addEventListener("canplay", onCanPlay);
            forestBackground.addEventListener("error", onError);
            forestBackground.load();
        });

        try {
            await (forestBackground as HTMLVideoElement).play();
        } catch (e) {
            console.error("Video play error:", e);
        }
    } else {
        // Static image background setup
        forestBackground = document.createElement("img");
        forestBackground.src = ASSETS.THEME_BACKGROUND;
        forestBackground.crossOrigin = "anonymous";

        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
            const onLoad = () => {
                forestBackground?.removeEventListener("load", onLoad);
                resolve();
            };

            const onError = (e: Event) => {
                forestBackground?.removeEventListener("error", onError);
                reject(e);
            };

            forestBackground.addEventListener("load", onLoad);
            forestBackground.addEventListener("error", onError);
        });
    }

    // Common styles for both video and image
    Object.assign(forestBackground.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        zIndex: "-2"
    });

    document.body.appendChild(forestBackground);

    // Setup effects
    WebGLRainEffect.setup();
    if (settings.store.enableMist) MistEffect.setup();
    setupDiscordReloadDetection();

    hideLoadingOverlay();
}

export function remove() {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    if (appMountObserver) appMountObserver.disconnect();

    if (forestBackground) {
        // Only pause if it's a video
        if (forestBackground instanceof HTMLVideoElement) {
            forestBackground.pause();
        }

        if (forestBackground.parentNode) {
            forestBackground.parentNode.removeChild(forestBackground);
        }
        forestBackground = null;
    }

    WebGLRainEffect.cleanup();
    MistEffect.remove();
}

function setupDiscordReloadDetection() {
    if (appMountObserver) appMountObserver.disconnect();

    appMountObserver = new MutationObserver(() => {
        if (!document.getElementById("app-mount")) {
            showLoadingOverlay();
            remove();
            reloadTimeout = setTimeout(() => {
                if (settings.store.showForestBackground) setup();
            }, 4000);
        }
    });

    if (document.body) {
        appMountObserver.observe(document.body, { childList: true, subtree: true });
    }
}
