/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { timeOfDayConfigs, weatherPhaseConfigs } from "../utils/configs";
import { lerp } from "../utils/helpers";
import { settings } from "../utils/settingsStore";

type WeatherPhase = "DRIZZLE" | "LIGHT_RAIN" | "HEAVY_RAIN" | "DOWNPOUR" | "THUNDERSTORM" | "CLEARING";
type TimeOfDay = "DAWN" | "MORNING" | "AFTERNOON" | "DUSK" | "NIGHT";

const WEATHER_CYCLE_DURATION = 45 * 60 * 1000;
const PHASE_TRANSITION_TIME = 5 * 60 * 1000;
const MAX_WIND_SHIFT = 15;

let dynamicWeatherInterval: NodeJS.Timeout | null = null;
let currentWeatherPhase: WeatherPhase = "LIGHT_RAIN";
let nextWeatherPhase: WeatherPhase = "LIGHT_RAIN";
let phaseStartTime: number = Date.now();
let phaseProgress: number = 0;
let currentWindDirection: number = -3;
let weatherIntensity: number = 0.5;
let timeOfDay: TimeOfDay = "AFTERNOON";

export function start() {
    if (dynamicWeatherInterval) stop();

    phaseStartTime = Date.now();
    currentWeatherPhase = "LIGHT_RAIN";
    nextWeatherPhase = determineNextPhase(currentWeatherPhase);
    updateTimeOfDay();
    currentWindDirection = -3;

    // Start with a delay to ensure plugin is initialized
    setTimeout(() => {
        dynamicWeatherInterval = setInterval(() => {
            try {
                updateWeatherParameters();
            } catch (e) {
                console.error("Weather update error:", e);
                if (dynamicWeatherInterval) {
                    clearInterval(dynamicWeatherInterval);
                    dynamicWeatherInterval = null;
                }
            }
        }, 10000);
    }, 2000); // 2-second delay
}

export function stop() {
    if (dynamicWeatherInterval) {
        clearInterval(dynamicWeatherInterval);
        dynamicWeatherInterval = null;
    }
}

function updateWeatherParameters() {
    // Skip if plugin is not active or settings not ready
    if (!settings.store) return;

    const now = Date.now();
    const elapsed = now - phaseStartTime;
    phaseProgress = Math.min(elapsed / WEATHER_CYCLE_DURATION, 1);

    updateTimeOfDay();

    if (phaseProgress >= 1) {
        currentWeatherPhase = nextWeatherPhase;
        nextWeatherPhase = determineNextPhase(currentWeatherPhase);
        phaseStartTime = now;
        phaseProgress = 0;

        const phaseConfig = weatherPhaseConfigs[nextWeatherPhase];
        const maxShift = phaseConfig.angleVariation;
        currentWindDirection += (Math.random() * maxShift * 2) - maxShift;
        currentWindDirection = Math.max(-45, Math.min(45, currentWindDirection));
    }

    const transitionProgress = Math.min(elapsed / PHASE_TRANSITION_TIME, 1);
    const isTransitioning = transitionProgress < 1;

    const currentConfig = weatherPhaseConfigs[currentWeatherPhase];
    const nextConfig = weatherPhaseConfigs[nextWeatherPhase];
    const timeConfig = timeOfDayConfigs[timeOfDay];

    // Use temporary store to avoid type errors
    const tempStore = {
        rainIntensity: settings.store.rainIntensity,
        rainScale: settings.store.rainScale,
        rainSpeed: settings.store.rainSpeed,
        rainVolume: settings.store.rainVolume,
        mistIntensity: settings.store.mistIntensity,
        rainAngle: settings.store.rainAngle
    };

    if (isTransitioning) {
        tempStore.rainIntensity = lerp(
            currentConfig.intensity,
            nextConfig.intensity,
            transitionProgress
        );

        tempStore.rainScale = lerp(
            currentConfig.scale,
            nextConfig.scale,
            transitionProgress
        );

        tempStore.rainSpeed = lerp(
            currentConfig.speed,
            nextConfig.speed,
            transitionProgress
        );

        tempStore.rainVolume = lerp(
            currentConfig.volume,
            nextConfig.volume,
            transitionProgress
        );

        tempStore.mistIntensity = lerp(
            currentConfig.mist,
            nextConfig.mist,
            transitionProgress
        );

        tempStore.rainAngle = currentWindDirection +
            (Math.sin(now / 60000) * currentConfig.angleVariation);
    } else {
        const fluctuationIntensity = 0.1;
        const timeVariation = Math.sin(now / 300000) * fluctuationIntensity;

        tempStore.rainIntensity = currentConfig.intensity +
            (timeVariation * currentConfig.intensity);

        tempStore.rainScale = currentConfig.scale +
            (timeVariation * 0.1);

        tempStore.rainSpeed = currentConfig.speed +
            (timeVariation * 0.2);

        tempStore.rainAngle = currentWindDirection +
            (Math.sin(now / 60000) * currentConfig.angleVariation);

        tempStore.mistIntensity = currentConfig.mist * timeConfig.mistMod;
    }

    // Apply the temporary values to the actual settings store
    settings.store.rainIntensity = tempStore.rainIntensity;
    settings.store.rainScale = tempStore.rainScale;
    settings.store.rainSpeed = tempStore.rainSpeed;
    settings.store.rainVolume = tempStore.rainVolume;
    settings.store.mistIntensity = tempStore.mistIntensity;
    settings.store.rainAngle = tempStore.rainAngle;

    weatherIntensity = settings.store.rainIntensity * timeConfig.lightMod;

    settings.store.enableThunder = nextConfig.thunder > 0.05;

    import("./WebGLRainEffect").then(m => m.update());
    import("./MistEffect").then(m => m.update());
    import("./ThunderEffect").then(m => m.updateVolume());
}

function determineNextPhase(current: WeatherPhase): WeatherPhase {
    const rand = Math.random();
    const hour = new Date().getHours();
    const stormChance = hour >= 12 && hour <= 18 ? 0.4 : 0.2;
    const clearingChance = hour >= 21 || hour <= 6 ? 0.5 : 0.2;

    switch (current) {
        case "DRIZZLE": return rand < 0.6 ? "LIGHT_RAIN" : "CLEARING";
        case "LIGHT_RAIN":
            if (rand < 0.3) return "DRIZZLE";
            if (rand < 0.6) return "HEAVY_RAIN";
            if (rand < stormChance + 0.6) return "THUNDERSTORM";
            return "CLEARING";
        case "HEAVY_RAIN":
            if (rand < 0.2) return "LIGHT_RAIN";
            if (rand < 0.5) return "DOWNPOUR";
            if (rand < stormChance + 0.5) return "THUNDERSTORM";
            return "CLEARING";
        case "DOWNPOUR":
            if (rand < 0.3) return "HEAVY_RAIN";
            if (rand < stormChance + 0.3) return "THUNDERSTORM";
            return "CLEARING";
        case "THUNDERSTORM":
            if (rand < 0.7) return "HEAVY_RAIN";
            return "CLEARING";
        case "CLEARING":
            return rand < clearingChance ? "DRIZZLE" : "LIGHT_RAIN";
        default: return "LIGHT_RAIN";
    }
}

function updateTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) timeOfDay = "DAWN";
    else if (hour >= 8 && hour < 12) timeOfDay = "MORNING";
    else if (hour >= 12 && hour < 17) timeOfDay = "AFTERNOON";
    else if (hour >= 17 && hour < 21) timeOfDay = "DUSK";
    else timeOfDay = "NIGHT";
}
