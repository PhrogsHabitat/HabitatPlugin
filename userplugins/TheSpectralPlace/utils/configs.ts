/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ASSETS } from "./Constants";

export const defaultConfigs = {
    Gentle: {
        volume: 40,
        gearDensity: 0.3,
        gearScale: 1.5,
        pistonSpeed: 0.3,
        brassTarnish: 0.2,
        sound: ASSETS.MECHANICAL_GENTLE,
        steamIntensity: 0.3,
        steamSpeed: 0.5,
        steamTurbulence: 0.8,
        steamHeight: 0.8,
        steamDissipation: 1.2,
        mechanicalRarity: 0.02,
        steamBurstIntensity: 0.5,
        steamBurstDuration: 2000
    },
    Moderate: {
        volume: 60,
        gearDensity: 0.7,
        gearScale: 1.2,
        pistonSpeed: 0.8,
        brassTarnish: 0.4,
        sound: ASSETS.MECHANICAL_MODERATE,
        steamIntensity: 0.6,
        steamSpeed: 1.0,
        steamTurbulence: 1.0,
        steamHeight: 1.0,
        steamDissipation: 1.0,
        mechanicalRarity: 0.05,
        steamBurstIntensity: 0.8,
        steamBurstDuration: 3000
    },
    Industrial: {
        volume: 80,
        gearDensity: 1.2,
        gearScale: 1.0,
        pistonSpeed: 1.5,
        brassTarnish: 0.6,
        sound: ASSETS.MECHANICAL_INDUSTRIAL,
        steamIntensity: 0.9,
        steamSpeed: 1.5,
        steamTurbulence: 1.3,
        steamHeight: 1.2,
        steamDissipation: 0.8,
        mechanicalRarity: 0.1,
        steamBurstIntensity: 1.2,
        steamBurstDuration: 4000
    },
    Overdrive: {
        volume: 100,
        gearDensity: 2.0,
        gearScale: 0.8,
        pistonSpeed: 2.5,
        brassTarnish: 0.8,
        sound: ASSETS.MECHANICAL_OVERDRIVE,
        steamIntensity: 1.2,
        steamSpeed: 2.0,
        steamTurbulence: 1.8,
        steamHeight: 1.5,
        steamDissipation: 0.6,
        mechanicalRarity: 0.15,
        steamBurstIntensity: 1.6,
        steamBurstDuration: 5000
    },
};

export const steamConfigs = [
    {
        id: "steam0",
        image: "STEAM_FRONT",
        zIndex: 1000,
        speedY: -0.8, // Negative for upward movement
        scale: 1.2,
        alpha: 0.4,
        wrapHeight: 3200
    },
    {
        id: "steam1",
        image: "STEAM_MID",
        zIndex: 999,
        speedY: -0.6,
        scale: 1.0,
        alpha: 0.5,
        wrapHeight: 2800
    },
    {
        id: "steam2",
        image: "STEAM_BACK",
        zIndex: 998,
        speedY: -0.4,
        scale: 0.8,
        alpha: 0.6,
        wrapHeight: 2400
    }
];

export const environmentPhaseConfigs = {
    CALM_WORKSHOP: {
        gearDensity: 0.2,
        gearScale: 1.6,
        pistonSpeed: 0.2,
        volume: 25,
        steam: 0.2,
        steamSpeed: 0.3,
        steamTurbulence: 0.6,
        steamHeight: 0.6,
        steamDissipation: 1.4,
        mechanical: 0.01,
        gearVariation: 2
    },
    ACTIVATING: {
        gearDensity: 0.5,
        gearScale: 1.3,
        pistonSpeed: 0.6,
        volume: 45,
        steam: 0.4,
        steamSpeed: 0.8,
        steamTurbulence: 0.9,
        steamHeight: 0.9,
        steamDissipation: 1.2,
        mechanical: 0.03,
        gearVariation: 5
    },
    FULL_OPERATION: {
        gearDensity: 0.9,
        gearScale: 1.0,
        pistonSpeed: 1.2,
        volume: 70,
        steam: 0.8,
        steamSpeed: 1.2,
        steamTurbulence: 1.2,
        steamHeight: 1.1,
        steamDissipation: 0.9,
        mechanical: 0.08,
        gearVariation: 8
    },
    OVERDRIVE: {
        gearDensity: 1.5,
        gearScale: 0.8,
        pistonSpeed: 2.0,
        volume: 90,
        steam: 1.2,
        steamSpeed: 1.8,
        steamTurbulence: 1.6,
        steamHeight: 1.4,
        steamDissipation: 0.7,
        mechanical: 0.15,
        gearVariation: 12
    },
    COOLING_DOWN: {
        gearDensity: 0.3,
        gearScale: 1.7,
        pistonSpeed: 0.3,
        volume: 20,
        steam: 0.3,
        steamSpeed: 0.4,
        steamTurbulence: 0.7,
        steamHeight: 0.7,
        steamDissipation: 1.3,
        mechanical: 0.005,
        gearVariation: 3
    }
};

export const timeOfDayConfigs = {
    DAWN: {
        lightMod: 0.6,
        color: [0.8, 0.6, 0.3],
        steamMod: 1.2,
        steamSpeedMod: 0.8,
        steamTurbulenceMod: 0.9
    },
    MORNING: {
        lightMod: 0.8,
        color: [1.0, 0.8, 0.5],
        steamMod: 0.9,
        steamSpeedMod: 1.0,
        steamTurbulenceMod: 1.0
    },
    AFTERNOON: {
        lightMod: 1.0,
        color: [1.0, 0.9, 0.6],
        steamMod: 0.7,
        steamSpeedMod: 1.1,
        steamTurbulenceMod: 1.1
    },
    DUSK: {
        lightMod: 0.7,
        color: [0.9, 0.7, 0.4],
        steamMod: 1.1,
        steamSpeedMod: 0.9,
        steamTurbulenceMod: 1.2
    },
    NIGHT: {
        lightMod: 0.4,
        color: [0.6, 0.5, 0.3],
        steamMod: 1.5,
        steamSpeedMod: 0.7,
        steamTurbulenceMod: 1.3
    }
};

// Steam burst side configurations for different preferences
export const steamBurstSideConfigs = {
    balanced: {
        description: "Random distribution between left, right, and center",
        weights: { left: 0.33, right: 0.33, center: 0.34 }
    },
    left: {
        description: "Primarily from the left side",
        weights: { left: 0.8, right: 0.1, center: 0.1 }
    },
    right: {
        description: "Primarily from the right side",
        weights: { left: 0.1, right: 0.8, center: 0.1 }
    },
    center: {
        description: "Primarily from the center",
        weights: { left: 0.1, right: 0.1, center: 0.8 }
    },
    alternating: {
        description: "Alternates between left and right sides",
        weights: { left: 0.5, right: 0.5, center: 0.0 }
    }
};
