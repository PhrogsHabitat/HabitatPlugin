/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ASSETS } from "./Constants";

export const defaultConfigs = {
    Normal: {
        volume: 70,
        intensity: 0.5,
        scale: 1.2, // Number
        angle: -3, // Number
        speed: 0.5, // Number
        thunderRarity: 0.05,
        sound: ASSETS.RAIN_SOFT,
        mistIntensity: 0.7
    },
    Slow: {
        volume: 56,
        intensity: 0.14,
        scale: 2.0, // Number
        angle: 0, // Number
        speed: 0.4, // Number
        thunderRarity: 0.02,
        sound: ASSETS.RAIN_SOFT,
        mistIntensity: 0.4
    },
    Heavy: {
        volume: 56,
        intensity: 0.28,
        scale: 1.0, // Number
        angle: 7.5, // Number
        speed: 1.2, // Number
        thunderRarity: 0.1,
        sound: ASSETS.RAIN_HEAVY,
        mistIntensity: 0.85
    },
    Downpour: {
        volume: 70,
        intensity: 0.91,
        scale: 1.4, // Number
        angle: 15, // Number
        speed: 1.7, // Number
        thunderRarity: 0.15,
        sound: ASSETS.RAIN_DOWNPOUR,
        mistIntensity: 1
    },
};

export const mistConfigs = [
    { id: "mist0", image: "MIST_MID", zIndex: 1000, speedX: 42, amplitude: 70, freq: 0.08, scale: 1.2, alpha: 0.6, wrapWidth: 2000 },
    { id: "mist1", image: "MIST_MID", zIndex: 1000, speedX: 35, amplitude: 80, freq: 0.07, scale: 1.1, alpha: 0.6, wrapWidth: 2200 },
    { id: "mist2", image: "MIST_BACK", zIndex: 1001, speedX: -20, amplitude: 60, freq: 0.09, scale: 1.3, alpha: 0.8, wrapWidth: 1800 },
    { id: "mist3", image: "MIST_MID", zIndex: 99, speedX: -12, amplitude: 70, freq: 0.07, scale: 0.9, alpha: 0.5, wrapWidth: 2400 },
    { id: "mist4", image: "MIST_BACK", zIndex: 88, speedX: 10, amplitude: 50, freq: 0.08, scale: 0.8, alpha: 1, wrapWidth: 2600 },
    { id: "mist5", image: "MIST_MID", zIndex: 39, speedX: 5, amplitude: 100, freq: 0.02, scale: 1.4, alpha: 1, wrapWidth: 3000 }
];

export const weatherPhaseConfigs = {
    DRIZZLE: {
        intensity: 0.15,
        scale: 1.8,
        speed: 0.3,
        volume: 30,
        mist: 0.4,
        thunder: 0.01,
        angleVariation: 5
    },
    LIGHT_RAIN: {
        intensity: 0.35,
        scale: 1.4,
        speed: 0.5,
        volume: 45,
        mist: 0.55,
        thunder: 0.03,
        angleVariation: 7
    },
    HEAVY_RAIN: {
        intensity: 0.65,
        scale: 1.1,
        speed: 0.9,
        volume: 60,
        mist: 0.7,
        thunder: 0.07,
        angleVariation: 10
    },
    DOWNPOUR: {
        intensity: 0.95,
        scale: 0.9,
        speed: 1.4,
        volume: 75,
        mist: 0.9,
        thunder: 0.12,
        angleVariation: 12
    },
    THUNDERSTORM: {
        intensity: 0.85,
        scale: 1.0,
        speed: 1.7,
        volume: 85,
        mist: 0.95,
        thunder: 0.25,
        angleVariation: 15
    },
    CLEARING: {
        intensity: 0.1,
        scale: 2.2,
        speed: 0.2,
        volume: 15,
        mist: 0.25,
        thunder: 0.001,
        angleVariation: 3
    }
};

export const timeOfDayConfigs = {
    DAWN: {
        lightMod: 0.7,
        color: [0.3, 0.2, 0.4],
        mistMod: 0.9
    },
    MORNING: {
        lightMod: 1.0,
        color: [0.2, 0.3, 1.0],
        mistMod: 0.7
    },
    AFTERNOON: {
        lightMod: 1.1,
        color: [0.25, 0.35, 1.0],
        mistMod: 0.6
    },
    DUSK: {
        lightMod: 0.6,
        color: [0.4, 0.2, 0.3],
        mistMod: 0.85
    },
    NIGHT: {
        lightMod: 0.4,
        color: [0.15, 0.15, 0.3],
        mistMod: 1.0
    }
};
