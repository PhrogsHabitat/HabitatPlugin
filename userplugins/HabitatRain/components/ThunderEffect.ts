/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defaultConfigs } from "../utils/configs";
import { ASSETS } from "../utils/Constants";
import { settings } from "../utils/settingsStore";
import * as MistEffect from "./MistEffect";

const thunderPool = [
    ASSETS.THUNDER1,
    ASSETS.THUNDER2,
    ASSETS.THUNDER3,
    ASSETS.THUNDER4,
    ASSETS.THUNDER5,
];

type RainInstance = {
    rainSound?: HTMLAudioElement;
    lightningInterval?: number;
    lightningOverlay?: HTMLDivElement;
};

let currentRain: RainInstance | null = null;

export function setMuted(muted: boolean) {
    if (currentRain?.rainSound) {
        currentRain.rainSound.muted = muted;
    }
}

export function start(preset: string = "Heavy") {
    stop();
    const config = defaultConfigs[preset];

    if (settings.store.enableThunder) {
        const lightningOverlay = document.createElement("div");
        lightningOverlay.style.position = "fixed";
        lightningOverlay.style.top = "0";
        lightningOverlay.style.left = "0";
        lightningOverlay.style.width = "100vw";
        lightningOverlay.style.height = "100vh";
        lightningOverlay.style.pointerEvents = "none";
        lightningOverlay.style.zIndex = "10000";
        lightningOverlay.style.backgroundColor = "transparent";
        lightningOverlay.style.transition = "background 0.1s ease";
        document.body.appendChild(lightningOverlay);

        const lightning = () => {
            if (settings.store.enableThunder && Math.random() < config.thunderRarity) {
                const flashIntensity = Math.random() * 0.7 + 0.3;
                lightningOverlay.style.backgroundColor = `rgba(173, 216, 230, ${flashIntensity})`;
                const thunderSound = new Audio(thunderPool[Math.floor(Math.random() * thunderPool.length)]);
                thunderSound.volume = settings.store.rainVolume / 100;
                thunderSound.play().catch(() => { });
                setTimeout(() => {
                    lightningOverlay.style.backgroundColor = "transparent";
                }, 100);
            }
        };

        const lightningInterval = setInterval(lightning, Math.random() * 4000 + 2000);
        currentRain = { lightningOverlay, lightningInterval: lightningInterval as unknown as number };
    }

    try {
        const rainSound = new Audio(config.sound);
        rainSound.loop = true;
        rainSound.volume = settings.store.rainVolume / 100;
        rainSound.play().catch(() => { });
        currentRain = { ...currentRain, rainSound };
    } catch (e) {
        console.error("Failed to play rain sound:", e);
    }
}

export function stop() {
    if (!currentRain) return;

    if (currentRain.rainSound) {
        currentRain.rainSound.pause();
        currentRain.rainSound = undefined;
    }
    if (currentRain.lightningInterval) {
        clearInterval(currentRain.lightningInterval);
        currentRain.lightningInterval = undefined;
    }
    if (currentRain.lightningOverlay) {
        currentRain.lightningOverlay.remove();
        currentRain.lightningOverlay = undefined;
    }
    currentRain = null;
}

export function enableThunder() {
    if (!currentRain) return;
    if (settings.store.enableThunder && !currentRain.lightningInterval) {
        // Re-create lightning overlay if missing
        if (!currentRain.lightningOverlay) {
            const lightningOverlay = document.createElement("div");
            lightningOverlay.style.position = "fixed";
            lightningOverlay.style.top = "0";
            lightningOverlay.style.left = "0";
            lightningOverlay.style.width = "100vw";
            lightningOverlay.style.height = "100vh";
            lightningOverlay.style.pointerEvents = "none";
            lightningOverlay.style.zIndex = "10000";
            lightningOverlay.style.backgroundColor = "transparent";
            lightningOverlay.style.transition = "background 0.1s ease";
            document.body.appendChild(lightningOverlay);
            currentRain.lightningOverlay = lightningOverlay;
        }
        const config = defaultConfigs[settings.store.preset || "Heavy"];
        const lightning = () => {
            if (settings.store.enableThunder && Math.random() < config.thunderRarity) {
                const flashIntensity = Math.random() * 0.7 + 0.3;
                currentRain!.lightningOverlay!.style.backgroundColor = `rgba(173, 216, 230, ${flashIntensity})`;
                const thunderSound = new Audio(thunderPool[Math.floor(Math.random() * thunderPool.length)]);
                thunderSound.volume = settings.store.rainVolume / 100;
                thunderSound.play().catch(() => { });
                setTimeout(() => {
                    currentRain!.lightningOverlay!.style.backgroundColor = "transparent";
                }, 100);
            }
        };
        const lightningInterval = setInterval(lightning, Math.random() * 4000 + 2000);
        currentRain.lightningInterval = lightningInterval as unknown as number;
    }
}

export function disableThunder() {
    if (currentRain?.lightningInterval) {
        clearInterval(currentRain.lightningInterval);
        currentRain.lightningInterval = undefined;
    }
    // Optionally hide overlay
    if (currentRain?.lightningOverlay) {
        currentRain.lightningOverlay.style.backgroundColor = "transparent";
    }
}

export function updatePresetSettings(preset: string) {
    const config = defaultConfigs[preset];
    if (config) {
        settings.store.rainVolume = config.volume;
        settings.store.rainIntensity = config.intensity;
        settings.store.rainScale = config.scale;
        settings.store.rainAngle = config.angle;
        settings.store.rainSpeed = config.speed;
        settings.store.mistIntensity = config.mistIntensity;

        start(preset);
        if (settings.store.enableMist) MistEffect.update();
    }
}

export function updateVolume() {
    if (currentRain?.rainSound) {
        currentRain.rainSound.volume = settings.store.rainVolume / 100;
    }
}

