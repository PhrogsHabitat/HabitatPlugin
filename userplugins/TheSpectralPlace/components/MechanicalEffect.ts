/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defaultConfigs } from "../utils/configs";
import { ASSETS } from "../utils/Constants";
import { settings } from "../utils/settingsStore";

const mechanicalPool = [
    ASSETS.GEAR_CLICK1,
    ASSETS.GEAR_CLICK2,
    ASSETS.PISTON_HISS1,
    ASSETS.PISTON_HISS2,
    ASSETS.STEAM_RELEASE1,
    ASSETS.STEAM_RELEASE2,
];

type MechanicalInstance = {
    mechanicalSound?: HTMLAudioElement;
    effectInterval?: number;
};

let currentMechanical: MechanicalInstance | null = null;

export function setMuted(muted: boolean) {
    if (currentMechanical?.mechanicalSound) {
        currentMechanical.mechanicalSound.muted = muted;
    }
}

export function start(preset: string = "Moderate") {
    stop();
    const config = defaultConfigs[preset];

    if (settings.store.enableMechanical) {
        const playMechanicalEffect = () => {
            if (settings.store.enableMechanical && Math.random() < config.mechanicalRarity) {
                const sound = new Audio(mechanicalPool[Math.floor(Math.random() * mechanicalPool.length)]);
                sound.volume = settings.store.mechanicalVolume / 100;
                sound.play().catch(() => { });
            }
        };

        const effectInterval = setInterval(playMechanicalEffect, Math.random() * 5000 + 3000);
        currentMechanical = { effectInterval: effectInterval as unknown as number };
    }

    try {
        const mechanicalSound = new Audio(config.sound);
        mechanicalSound.loop = true;
        mechanicalSound.volume = settings.store.mechanicalVolume / 100;
        mechanicalSound.play().catch(() => { });
        currentMechanical = { ...currentMechanical, mechanicalSound };
    } catch (e) {
        console.error("Failed to play mechanical sound:", e);
    }
}

export function stop() {
    if (!currentMechanical) return;

    if (currentMechanical.mechanicalSound) {
        currentMechanical.mechanicalSound.pause();
        currentMechanical.mechanicalSound = undefined;
    }
    if (currentMechanical.effectInterval) {
        clearInterval(currentMechanical.effectInterval);
        currentMechanical.effectInterval = undefined;
    }
    currentMechanical = null;
}

export function enableMechanical() {
    if (!currentMechanical) return;
    if (settings.store.enableMechanical && !currentMechanical.effectInterval) {
        const config = defaultConfigs[settings.store.preset || "Moderate"];
        const playMechanicalEffect = () => {
            if (settings.store.enableMechanical && Math.random() < config.mechanicalRarity) {
                const sound = new Audio(mechanicalPool[Math.floor(Math.random() * mechanicalPool.length)]);
                sound.volume = settings.store.mechanicalVolume / 100;
                sound.play().catch(() => { });
            }
        };
        const effectInterval = setInterval(playMechanicalEffect, Math.random() * 5000 + 3000);
        currentMechanical.effectInterval = effectInterval as unknown as number;
    }
}

export function disableMechanical() {
    if (currentMechanical?.effectInterval) {
        clearInterval(currentMechanical.effectInterval);
        currentMechanical.effectInterval = undefined;
    }
}

export function updatePresetSettings(preset: string) {
    const config = defaultConfigs[preset];
    if (config) {
        settings.store.mechanicalVolume = config.volume;
        settings.store.gearDensity = config.gearDensity;
        settings.store.gearScale = config.gearScale;
        settings.store.pistonSpeed = config.pistonSpeed;
        settings.store.brassTarnish = config.brassTarnish;
        settings.store.steamIntensity = config.steamIntensity;

        start(preset);
        if (settings.store.enableSteam) import("./SteamEffect.js").then(m => m.update());
    }
}

export function updateVolume() {
    if (currentMechanical?.mechanicalSound) {
        currentMechanical.mechanicalSound.volume = settings.store.mechanicalVolume / 100;
    }
}
