/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { COLORS } from "./Constants";

/**
 * Configuration interface for cosmic themes
 */
export interface CosmicTheme {
    name: string;
    description: string;
    stardustCount: number;
    stardustDrift: string;
    galaxyOpacity: number;
    mistIntensity: number;
    mistSpeed: number;
    primaryColor: string;
    accentColor: string;
}

/**
 * Configuration interface for mist layers
 */
export interface MistLayerConfig {
    image: string;
    alpha: number;
    scale: number;
    speed: number;
    direction: number;
    wrapWidth: number;
}

/**
 * Predefined cosmic theme configurations
 */
export const cosmicThemes: Record<string, CosmicTheme> = {
    NEBULA: {
        name: "Nebula",
        description: "A colorful cosmic nebula with vibrant stardust",
        stardustCount: 150,
        stardustDrift: "float",
        galaxyOpacity: 0.6,
        mistIntensity: 0.8,
        mistSpeed: 1.2,
        primaryColor: COLORS.COBALT_BLUE,
        accentColor: COLORS.MIDNIGHT_PURPLE,
    },
    DEEP_SPACE: {
        name: "Deep Space",
        description: "The vast emptiness of deep space with minimal effects",
        stardustCount: 50,
        stardustDrift: "up",
        galaxyOpacity: 0.3,
        mistIntensity: 0.4,
        mistSpeed: 0.6,
        primaryColor: COLORS.MIDNIGHT_PURPLE,
        accentColor: COLORS.STEEL_GRAY,
    },
    SOLAR_STORM: {
        name: "Solar Storm",
        description: "Intense solar activity with dynamic effects",
        stardustCount: 200,
        stardustDrift: "down",
        galaxyOpacity: 0.8,
        mistIntensity: 1.0,
        mistSpeed: 2.0,
        primaryColor: COLORS.SUN,
        accentColor: COLORS.RUBY_RED,
    },
    LUNAR_CALM: {
        name: "Lunar Calm",
        description: "Peaceful moonlit space with gentle movements",
        stardustCount: 80,
        stardustDrift: "float",
        galaxyOpacity: 0.4,
        mistIntensity: 0.5,
        mistSpeed: 0.8,
        primaryColor: COLORS.MOON,
        accentColor: COLORS.STEEL_GRAY,
    },
    COSMIC_DANCE: {
        name: "Cosmic Dance",
        description: "Balanced cosmic effects with harmonious movement",
        stardustCount: 100,
        stardustDrift: "float",
        galaxyOpacity: 0.5,
        mistIntensity: 0.7,
        mistSpeed: 1.0,
        primaryColor: COLORS.COBALT_BLUE,
        accentColor: COLORS.MOON,
    },
};

/**
 * Mist layer configurations for different visual depths
 */
export const mistLayerConfigs: Record<string, MistLayerConfig> = {
    FRONT: {
        image: "MISTFront",
        alpha: 0.6,
        scale: 1.0,
        speed: 1.5,
        direction: 1,
        wrapWidth: 3000,
    },
    MID: {
        image: "MISTMid",
        alpha: 0.4,
        scale: 1.2,
        speed: 1.0,
        direction: -1,
        wrapWidth: 3000,
    },
    BACK: {
        image: "MISTBack",
        alpha: 0.3,
        scale: 1.5,
        speed: 0.7,
        direction: 1,
        wrapWidth: 3000,
    },
};

/**
 * Animation timing configurations
 */
export const animationConfigs = {
    STARDUST: {
        minDuration: 8,
        maxDuration: 14,
        delayVariation: 2,
    },
    SUN_MOON: {
        cycleDuration: 120000, // 2 minutes
        transitionDuration: 5000, // 5 seconds
    },
    MIST: {
        baseSpeed: 1.0,
        speedVariation: 0.3,
        directionChangeInterval: 30000, // 30 seconds
    },
    GALAXY: {
        fadeInDuration: 1000,
        fadeOutDuration: 500,
    },
};

/**
 * Accessibility configurations
 */
export const accessibilityConfigs = {
    REDUCED_MOTION: {
        stardustCount: 20,
        stardustDrift: "float",
        mistSpeed: 0.2,
        disableAnimations: true,
    },
    HIGH_CONTRAST: {
        galaxyOpacity: 0.2,
        mistIntensity: 0.3,
        enhanceStardust: true,
    },
};

/**
 * Performance optimization configurations
 */
export const performanceConfigs = {
    LOW_END: {
        maxStardust: 50,
        reducedMistLayers: 1,
        lowerFrameRate: true,
    },
    HIGH_END: {
        maxStardust: 200,
        fullMistLayers: 3,
        highFrameRate: true,
    },
};

/**
 * Applies a cosmic theme configuration to settings
 */
export function applyCosmicTheme(themeName: string, settings: any): void {
    const theme = cosmicThemes[themeName];
    if (!theme) {
        console.warn(`Unknown cosmic theme: ${themeName}`);
        return;
    }

    try {
        settings.store.stardustCount = theme.stardustCount;
        settings.store.stardustDrift = theme.stardustDrift;
        settings.store.galaxyOpacity = theme.galaxyOpacity;
        settings.store.mistIntensity = theme.mistIntensity;
        settings.store.mistSpeed = theme.mistSpeed;

        console.log(`Applied cosmic theme: ${theme.name}`);
    } catch (error) {
        console.error(`Failed to apply cosmic theme ${themeName}:`, error);
    }
}

/**
 * Gets the appropriate configuration based on user preferences
 */
export function getAdaptiveConfig(baseConfig: any, userPreferences: any): any {
    let config = { ...baseConfig };

    // Apply accessibility adjustments
    if (userPreferences.prefersReducedMotion) {
        config = { ...config, ...accessibilityConfigs.REDUCED_MOTION };
    }

    if (userPreferences.prefersHighContrast) {
        config = { ...config, ...accessibilityConfigs.HIGH_CONTRAST };
    }

    // Apply performance adjustments based on device capabilities
    if (userPreferences.lowEndDevice) {
        config = { ...config, ...performanceConfigs.LOW_END };
    }

    return config;
}
