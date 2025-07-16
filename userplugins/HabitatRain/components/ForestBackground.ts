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

export let forestBackground: HTMLVideoElement | null = null;
let reloadTimeout: NodeJS.Timeout | null = null;
let appMountObserver: MutationObserver | null = null;

export async function setup() {
    if (forestBackground) return;
    showLoadingOverlay();

    forestBackground = document.createElement("video");
    forestBackground.src = ASSETS.THEME_BACKGROUND;
    forestBackground.style.position = "fixed";
    forestBackground.style.top = "0";
    forestBackground.style.left = "0";
    forestBackground.style.width = "100%";
    forestBackground.style.height = "100%";
    forestBackground.style.objectFit = "cover";
    forestBackground.style.zIndex = "-2";
    forestBackground.autoplay = true;
    forestBackground.loop = true;
    forestBackground.muted = true;
    forestBackground.crossOrigin = "anonymous";
    forestBackground.playsInline = true;
    forestBackground.preload = "auto";

    document.body.appendChild(forestBackground);

    // Wait for video to load enough data
    await new Promise<void>(resolve => {
        const onCanPlay = () => {
            forestBackground?.removeEventListener("canplay", onCanPlay);
            resolve();
        };

        forestBackground.addEventListener("canplay", onCanPlay);
        forestBackground.load();
    });

    try {
        await forestBackground.play();
    } catch (e) {
        console.error("Video play error:", e);
    }

    forestBackground.onerror = () => {
        console.error("Video failed to load. Retrying...");
        setTimeout(() => {
            if (forestBackground) forestBackground.src = ASSETS.THEME_BACKGROUND + "?" + Date.now();
        }, 2000);
    };

    WebGLRainEffect.setup();
    if (settings.store.enableMist) MistEffect.setup();
    setupDiscordReloadDetection();

    hideLoadingOverlay();
}

export function remove() {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    if (appMountObserver) appMountObserver.disconnect();

    if (forestBackground?.parentNode) {
        forestBackground.pause();
        forestBackground.parentNode.removeChild(forestBackground);
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
