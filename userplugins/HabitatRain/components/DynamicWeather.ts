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

const WEATHER_CYCLE_DURATION = 45 * 60 * 1000; // 45 minutes
const PHASE_TRANSITION_TIME = 2 * 60 * 1000; // Reduced to 2 minutes for smoother transitions
const MAX_WIND_SHIFT = 15;

let dynamicWeatherInterval: NodeJS.Timeout | null = null;
let currentWeatherPhase: WeatherPhase = "LIGHT_RAIN";
let nextWeatherPhase: WeatherPhase = "LIGHT_RAIN";
let phaseStartTime: number = Date.now();
let phaseProgress: number = 0;
let currentWindDirection: number = -3;
let weatherIntensity: number = 0.5;
let timeOfDay: TimeOfDay = "AFTERNOON";
let isTransitioning: boolean = false;

export function start() {
    if (dynamicWeatherInterval) stop();

    phaseStartTime = Date.now();
    currentWeatherPhase = "LIGHT_RAIN";
    nextWeatherPhase = determineNextPhase(currentWeatherPhase);
    updateTimeOfDay();
    currentWindDirection = -3;
    isTransitioning = false;

    console.log("Dynamic Weather: Starting with phase:", currentWeatherPhase);

    // Start with a delay to ensure plugin is initialized
    setTimeout(() => {
        dynamicWeatherInterval = setInterval(() => {
            try {
                updateWeatherParameters();
            } catch (e) {
                console.error("Weather update error:", e);
                stop();
            }
        }, 5000); // Update every 5 seconds instead of 10
    }, 2000);
}

export function stop() {
    if (dynamicWeatherInterval) {
        clearInterval(dynamicWeatherInterval);
        dynamicWeatherInterval = null;
    }
    console.log("Dynamic Weather: Stopped");
}

function updateWeatherParameters() {
    // Skip if plugin is not active or settings not ready
    if (!settings.store || !settings.store.dynamicWeather) return;

    const now = Date.now();
    const elapsed = now - phaseStartTime;
    phaseProgress = Math.min(elapsed / WEATHER_CYCLE_DURATION, 1);

    updateTimeOfDay();

    // Check if we should transition to next phase
    if (phaseProgress >= 1 && !isTransitioning) {
        isTransitioning = true;
        currentWeatherPhase = nextWeatherPhase;
        nextWeatherPhase = determineNextPhase(currentWeatherPhase);
        phaseStartTime = now;
        phaseProgress = 0;

        const phaseConfig = weatherPhaseConfigs[nextWeatherPhase];
        const maxShift = phaseConfig.angleVariation;
        currentWindDirection += (Math.random() * maxShift * 2) - maxShift;
        currentWindDirection = Math.max(-45, Math.min(45, currentWindDirection));

        console.log("Dynamic Weather: Transitioning to", nextWeatherPhase, "Wind:", currentWindDirection);

        // Reset transitioning flag after a short delay
        setTimeout(() => {
            isTransitioning = false;
        }, PHASE_TRANSITION_TIME);
    }

    const transitionProgress = Math.min(elapsed / PHASE_TRANSITION_TIME, 1);
    const isInTransition = transitionProgress < 1 && isTransitioning;

    const currentConfig = weatherPhaseConfigs[currentWeatherPhase];
    const nextConfig = weatherPhaseConfigs[nextWeatherPhase];
    const timeConfig = timeOfDayConfigs[timeOfDay];

    if (!currentConfig || !nextConfig || !timeConfig) {
        console.warn("Dynamic Weather: Missing configs", { currentConfig, nextConfig, timeConfig });
        return;
    }

    // Calculate values based on transition state
    let rainIntensity, rainScale, rainSpeed, rainVolume, mistIntensity, rainAngle;

    if (isInTransition) {
        // Smooth transition between phases
        rainIntensity = lerp(currentConfig.intensity, nextConfig.intensity, transitionProgress);
        rainScale = lerp(currentConfig.scale, nextConfig.scale, transitionProgress);
        rainSpeed = lerp(currentConfig.speed, nextConfig.speed, transitionProgress);
        rainVolume = lerp(currentConfig.volume, nextConfig.volume, transitionProgress);
        mistIntensity = lerp(currentConfig.mist, nextConfig.mist, transitionProgress);

        // Smooth wind transition
        const targetWind = currentWindDirection + (Math.sin(now / 60000) * nextConfig.angleVariation);
        rainAngle = lerp(
            currentWindDirection + (Math.sin(now / 60000) * currentConfig.angleVariation),
            targetWind,
            transitionProgress
        );
    } else {
        // Normal phase with subtle variations
        const fluctuationIntensity = 0.08; // Reduced variation
        const timeVariation = Math.sin(now / 300000) * fluctuationIntensity;

        rainIntensity = currentConfig.intensity + (timeVariation * currentConfig.intensity * 0.3);
        rainScale = currentConfig.scale + (timeVariation * 0.05);
        rainSpeed = currentConfig.speed + (timeVariation * 0.1);
        rainVolume = currentConfig.volume;
        rainAngle = currentWindDirection + (Math.sin(now / 60000) * currentConfig.angleVariation);
        mistIntensity = currentConfig.mist * timeConfig.mistMod;
    }

    // Apply time of day modifications
    rainIntensity *= timeConfig.lightMod;

    // Update settings store
    try {
        settings.store.rainIntensity = Math.max(0, Math.min(5, rainIntensity));
        settings.store.rainScale = Math.max(0.05, Math.min(3, rainScale));
        settings.store.rainSpeed = Math.max(0.01, Math.min(10, rainSpeed));
        settings.store.rainVolume = Math.max(0, Math.min(500, rainVolume));
        settings.store.mistIntensity = Math.max(0, Math.min(3, mistIntensity));
        settings.store.rainAngle = rainAngle;
        settings.store.enableThunder = nextConfig.thunder > 0.05 && settings.store.enableThunder;

        weatherIntensity = settings.store.rainIntensity;

        // Update effects
        import("./WebGLRainEffect.js").then(m => {
            if (m.update) m.update();
        }).catch(console.error);

        import("./MistEffect.js").then(m => {
            if (m.update) m.update();
        }).catch(console.error);

        import("./ThunderEffect.js").then(m => {
            if (m.updateVolume) m.updateVolume();
        }).catch(console.error);

    } catch (e) {
        console.error("Dynamic Weather: Error updating settings", e);
    }
}

function determineNextPhase(current: WeatherPhase): WeatherPhase {
    const rand = Math.random();
    const hour = new Date().getHours();

    // More balanced probabilities
    const stormChance = hour >= 12 && hour <= 18 ? 0.3 : 0.15;
    const clearingChance = hour >= 21 || hour <= 6 ? 0.4 : 0.15;

    switch (current) {
        case "DRIZZLE":
            if (rand < 0.4) return "LIGHT_RAIN";
            if (rand < 0.7) return "CLEARING";
            return "DRIZZLE"; // 30% chance to stay

        case "LIGHT_RAIN":
            if (rand < 0.25) return "DRIZZLE";
            if (rand < 0.45) return "HEAVY_RAIN";
            if (rand < 0.45 + stormChance) return "THUNDERSTORM";
            if (rand < 0.7 + stormChance) return "CLEARING";
            return "LIGHT_RAIN"; // ~30% chance to stay

        case "HEAVY_RAIN":
            if (rand < 0.2) return "LIGHT_RAIN";
            if (rand < 0.4) return "DOWNPOUR";
            if (rand < 0.4 + stormChance) return "THUNDERSTORM";
            if (rand < 0.6 + stormChance) return "CLEARING";
            return "HEAVY_RAIN"; // ~40% chance to stay

        case "DOWNPOUR":
            if (rand < 0.25) return "HEAVY_RAIN";
            if (rand < 0.25 + stormChance) return "THUNDERSTORM";
            if (rand < 0.5 + stormChance) return "CLEARING";
            return "DOWNPOUR"; // ~50% chance to stay

        case "THUNDERSTORM":
            if (rand < 0.5) return "HEAVY_RAIN";
            if (rand < 0.7) return "DOWNPOUR";
            return "CLEARING";

        case "CLEARING":
            if (rand < clearingChance) return "DRIZZLE";
            if (rand < clearingChance + 0.3) return "LIGHT_RAIN";
            return "CLEARING"; // Higher chance to stay clear

        default:
            return "LIGHT_RAIN";
    }
}

function updateTimeOfDay() {
    const hour = new Date().getHours();
    let newTimeOfDay: TimeOfDay;

    if (hour >= 5 && hour < 8) newTimeOfDay = "DAWN";
    else if (hour >= 8 && hour < 12) newTimeOfDay = "MORNING";
    else if (hour >= 12 && hour < 17) newTimeOfDay = "AFTERNOON";
    else if (hour >= 17 && hour < 21) newTimeOfDay = "DUSK";
    else newTimeOfDay = "NIGHT";

    if (newTimeOfDay !== timeOfDay) {
        timeOfDay = newTimeOfDay;
        console.log("Dynamic Weather: Time of day changed to", timeOfDay);
    }
}

// Export for debugging
export function getWeatherState() {
    return {
        currentPhase: currentWeatherPhase,
        nextPhase: nextWeatherPhase,
        timeOfDay,
        phaseProgress,
        isTransitioning,
        windDirection: currentWindDirection
    };
}
