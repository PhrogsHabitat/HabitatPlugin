/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { environmentPhaseConfigs, timeOfDayConfigs } from "../utils/configs";
import { lerp } from "../utils/helpers";
import { settings } from "../utils/settingsStore";

type EnvironmentPhase = "CALM_WORKSHOP" | "ACTIVATING" | "FULL_OPERATION" | "OVERDRIVE" | "COOLING_DOWN";
type TimeOfDay = "DAWN" | "MORNING" | "AFTERNOON" | "DUSK" | "NIGHT";

const ENVIRONMENT_CYCLE_DURATION = 45 * 60 * 1000; // 45 minutes
const PHASE_TRANSITION_TIME = 2 * 60 * 1000; // 2 minutes for transitions
const MAX_GEAR_VARIATION = 15;

let dynamicEnvironmentInterval: NodeJS.Timeout | null = null;
let currentEnvironmentPhase: EnvironmentPhase = "ACTIVATING";
let nextEnvironmentPhase: EnvironmentPhase = "ACTIVATING";
let phaseStartTime: number = Date.now();
let phaseProgress: number = 0;
let currentGearVariation: number = 5;
let environmentIntensity: number = 0.7;
let timeOfDay: TimeOfDay = "AFTERNOON";
let isTransitioning: boolean = false;

export function start() {
    if (dynamicEnvironmentInterval) stop();

    phaseStartTime = Date.now();
    currentEnvironmentPhase = "ACTIVATING";
    nextEnvironmentPhase = determineNextPhase(currentEnvironmentPhase);
    updateTimeOfDay();
    currentGearVariation = 5;
    isTransitioning = false;

    console.log("Dynamic Environment: Starting with phase:", currentEnvironmentPhase);

    setTimeout(() => {
        dynamicEnvironmentInterval = setInterval(() => {
            try {
                updateEnvironmentParameters();
            } catch (e) {
                console.error("Environment update error:", e);
                stop();
            }
        }, 5000);
    }, 2000);
}

export function stop() {
    if (dynamicEnvironmentInterval) {
        clearInterval(dynamicEnvironmentInterval);
        dynamicEnvironmentInterval = null;
    }
    console.log("Dynamic Environment: Stopped");
}

function updateEnvironmentParameters() {
    if (!settings.store || !settings.store.dynamicEnvironment) return;

    const now = Date.now();
    const elapsed = now - phaseStartTime;
    phaseProgress = Math.min(elapsed / ENVIRONMENT_CYCLE_DURATION, 1);

    updateTimeOfDay();

    if (phaseProgress >= 1 && !isTransitioning) {
        isTransitioning = true;
        currentEnvironmentPhase = nextEnvironmentPhase;
        nextEnvironmentPhase = determineNextPhase(currentEnvironmentPhase);
        phaseStartTime = now;
        phaseProgress = 0;

        const phaseConfig = environmentPhaseConfigs[nextEnvironmentPhase];
        const maxShift = phaseConfig.gearVariation;
        currentGearVariation += (Math.random() * maxShift * 2) - maxShift;
        currentGearVariation = Math.max(2, Math.min(20, currentGearVariation));

        console.log("Dynamic Environment: Transitioning to", nextEnvironmentPhase, "Gear Variation:", currentGearVariation);

        setTimeout(() => {
            isTransitioning = false;
        }, PHASE_TRANSITION_TIME);
    }

    const transitionProgress = Math.min(elapsed / PHASE_TRANSITION_TIME, 1);
    const isInTransition = transitionProgress < 1 && isTransitioning;

    const currentConfig = environmentPhaseConfigs[currentEnvironmentPhase];
    const nextConfig = environmentPhaseConfigs[nextEnvironmentPhase];
    const timeConfig = timeOfDayConfigs[timeOfDay];

    if (!currentConfig || !nextConfig || !timeConfig) {
        console.warn("Dynamic Environment: Missing configs", { currentConfig, nextConfig, timeConfig });
        return;
    }

    let gearDensity, gearScale, pistonSpeed, mechanicalVolume, steamIntensity, brassTarnish;

    if (isInTransition) {
        gearDensity = lerp(currentConfig.gearDensity, nextConfig.gearDensity, transitionProgress);
        gearScale = lerp(currentConfig.gearScale, nextConfig.gearScale, transitionProgress);
        pistonSpeed = lerp(currentConfig.pistonSpeed, nextConfig.pistonSpeed, transitionProgress);
        mechanicalVolume = lerp(currentConfig.volume, nextConfig.volume, transitionProgress);
        steamIntensity = lerp(currentConfig.steam, nextConfig.steam, transitionProgress);
        brassTarnish = lerp(0.3, 0.7, transitionProgress);
    } else {
        const fluctuationIntensity = 0.08;
        const timeVariation = Math.sin(now / 300000) * fluctuationIntensity;

        gearDensity = currentConfig.gearDensity + (timeVariation * currentConfig.gearDensity * 0.3);
        gearScale = currentConfig.gearScale + (timeVariation * 0.05);
        pistonSpeed = currentConfig.pistonSpeed + (timeVariation * 0.1);
        mechanicalVolume = currentConfig.volume;
        steamIntensity = currentConfig.steam * timeConfig.steamMod;
        brassTarnish = 0.3 + timeVariation * 0.2;
    }

    gearDensity *= timeConfig.lightMod;

    try {
        settings.store.gearDensity = Math.max(0, Math.min(5, gearDensity));
        settings.store.gearScale = Math.max(0.05, Math.min(3, gearScale));
        settings.store.pistonSpeed = Math.max(0.01, Math.min(10, pistonSpeed));
        settings.store.mechanicalVolume = Math.max(0, Math.min(500, mechanicalVolume));
        settings.store.steamIntensity = Math.max(0, Math.min(3, steamIntensity));
        settings.store.brassTarnish = Math.max(0, Math.min(1, brassTarnish));
        settings.store.enableMechanical = nextConfig.mechanical > 0.05 && settings.store.enableMechanical;

        environmentIntensity = settings.store.gearDensity;

        import("./WebGLSteampunkEffect.js").then(m => {
            if (m.update) m.update();
        }).catch(console.error);

        import("./SteamEffect.js").then(m => {
            if (m.update) m.update();
        }).catch(console.error);

        import("./MechanicalEffect.js").then(m => {
            if (m.updateVolume) m.updateVolume();
        }).catch(console.error);

    } catch (e) {
        console.error("Dynamic Environment: Error updating settings", e);
    }
}

function determineNextPhase(current: EnvironmentPhase): EnvironmentPhase {
    const rand = Math.random();
    const hour = new Date().getHours();

    const overdriveChance = hour >= 14 && hour <= 18 ? 0.25 : 0.15;
    const coolingChance = hour >= 22 || hour <= 6 ? 0.35 : 0.2;

    switch (current) {
        case "CALM_WORKSHOP":
            if (rand < 0.4) return "ACTIVATING";
            if (rand < 0.7) return "COOLING_DOWN";
            return "CALM_WORKSHOP";

        case "ACTIVATING":
            if (rand < 0.25) return "CALM_WORKSHOP";
            if (rand < 0.45) return "FULL_OPERATION";
            if (rand < 0.45 + overdriveChance) return "OVERDRIVE";
            if (rand < 0.7 + overdriveChance) return "COOLING_DOWN";
            return "ACTIVATING";

        case "FULL_OPERATION":
            if (rand < 0.2) return "ACTIVATING";
            if (rand < 0.4) return "OVERDRIVE";
            if (rand < 0.4 + overdriveChance) return "OVERDRIVE";
            if (rand < 0.6 + overdriveChance) return "COOLING_DOWN";
            return "FULL_OPERATION";

        case "OVERDRIVE":
            if (rand < 0.5) return "FULL_OPERATION";
            if (rand < 0.7) return "OVERDRIVE";
            return "COOLING_DOWN";

        case "COOLING_DOWN":
            if (rand < coolingChance) return "CALM_WORKSHOP";
            if (rand < coolingChance + 0.3) return "ACTIVATING";
            return "COOLING_DOWN";

        default:
            return "ACTIVATING";
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
        console.log("Dynamic Environment: Time of day changed to", timeOfDay);
    }
}

export function getEnvironmentState() {
    return {
        currentPhase: currentEnvironmentPhase,
        nextPhase: nextEnvironmentPhase,
        timeOfDay,
        phaseProgress,
        isTransitioning,
        gearVariation: currentGearVariation
    };
}
