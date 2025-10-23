/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, OptionType } from "@api/Settings";

import { defaultConfigs } from "./configs";

// Helper to safely access settings
function safeSet(setter: (value: any) => void, value: any) {
    try {
        setter(value);
    } catch (e) {
        console.warn("Settings not ready yet, queuing update");
        setTimeout(() => safeSet(setter, value), 100);
    }
}

export const settings = definePluginSettings({
    dynamicEnvironment: {
        type: OptionType.BOOLEAN,
        description: "Enable dynamic steampunk environment simulation",
        default: false,
        onChange: (value: boolean) => {
            try {
                if (value) {
                    import("../components/DynamicEnvironment.js").then(m => m.start());
                } else {
                    import("../components/DynamicEnvironment.js").then(m => m.stop());
                }
            } catch (e) {
                console.error("Error in dynamicEnvironment onChange:", e);
            }
        },
    },
    preset: {
        type: OptionType.SELECT,
        description: "Choose a steampunk preset to quickly apply settings.",
        options: [
            { label: "🛠️ Gentle Workshop", value: "Gentle" },
            { label: "⚙️ Moderate Factory", value: "Moderate" },
            { label: "🏭 Industrial District", value: "Industrial" },
            { label: "🔥 Overdrive Engine", value: "Overdrive" }
        ],
        default: "Moderate",
        onChange: (preset: string) => {
            import("../components/MechanicalEffect.js").then(m => m.updatePresetSettings(preset));
        },
    },
    enableMechanical: {
        type: OptionType.BOOLEAN,
        description: "Enable mechanical sound effects",
        default: true,
        onChange: (value: boolean) => {
            import("../components/MechanicalEffect.js").then(m => value ? m.enableMechanical() : m.disableMechanical());
        },
    },
    enableSteam: {
        type: OptionType.BOOLEAN,
        description: "Enable steam and vapor effects",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/SteamEffect.js").then(m => m.setup());
            } else {
                import("../components/SteamEffect.js").then(m => m.remove());
            }
        },
    },
    steamIntensity: {
        type: OptionType.SLIDER,
        description: "Adjust steam density and visibility",
        default: (defaultConfigs.Moderate.steamIntensity),
        min: 0,
        max: 3,
        step: 0.01,
        markers: [0, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        onChange: () => {
            import("../components/SteamEffect.js").then(m => m.update());
        },
    },
    steamSpeed: {
        type: OptionType.SLIDER,
        description: "Adjust steam animation speed",
        default: defaultConfigs.Moderate.steamSpeed,
        min: 0.1,
        max: 3.0,
        step: 0.1,
        markers: [0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
        onChange: () => {
            import("../components/WebGLSteamEffect.js").then(m => m.update());
        },
    },
    steamTurbulence: {
        type: OptionType.SLIDER,
        description: "Adjust steam turbulence and swirl",
        default: defaultConfigs.Moderate.steamTurbulence,
        min: 0.1,
        max: 3.0,
        step: 0.1,
        markers: [0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
        onChange: () => {
            import("../components/WebGLSteamEffect.js").then(m => m.update());
        },
    },
    steamHeight: {
        type: OptionType.SLIDER,
        description: "Adjust steam column height",
        default: defaultConfigs.Moderate.steamHeight,
        min: 0.1,
        max: 3.0,
        step: 0.1,
        markers: [0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
        onChange: () => {
            import("../components/WebGLSteamEffect.js").then(m => m.update());
        },
    },
    steamDissipation: {
        type: OptionType.SLIDER,
        description: "Adjust steam dissipation rate",
        default: defaultConfigs.Moderate.steamDissipation,
        min: 0.1,
        max: 3.0,
        step: 0.1,
        markers: [0.1, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
        onChange: () => {
            import("../components/WebGLSteamEffect.js").then(m => m.update());
        },
    },
    mechanicalVolume: {
        type: OptionType.SLIDER,
        description: "Adjust mechanical sound volume",
        default: defaultConfigs.Moderate.volume,
        min: 0,
        max: 500,
        step: 1,
        markers: [0, 10, 25, 50, 75, 100, 200, 300, 400, 500],
        onChange: () => {
            import("../components/MechanicalEffect.js").then(m => m.updateVolume());
        },
    },
    gearDensity: {
        type: OptionType.SLIDER,
        description: "Adjust mechanical element density",
        default: defaultConfigs.Moderate.gearDensity,
        min: 0,
        max: 5,
        step: 0.01,
        markers: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1, 2, 3, 4, 5],
        onChange: () => {
            import("../components/WebGLSteampunkEffect.js").then(m => m.update());
        },
    },
    gearScale: {
        type: OptionType.BIGINT,
        description: "Adjust mechanical element size",
        min: 0.05,
        max: 3.0,
        step: 0.01,
        onChange: (value: number) => {
            safeSet(() => {
                settings.store.gearScale = value;
                import("../components/WebGLSteampunkEffect.js").then(m => m.update());
            }, value);
        },
    },
    pistonSpeed: {
        type: OptionType.SLIDER,
        description: "Adjust piston animation speed",
        default: 1.0,
        min: 0.01,
        max: 10.0,
        step: 0.01,
        markers: [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
        onChange: (value: number) => {
            safeSet(() => {
                settings.store.pistonSpeed = value;
                import("../components/WebGLSteampunkEffect.js").then(m => m.update());
            }, value);
        },
    },
    brassTarnish: {
        type: OptionType.SLIDER,
        description: "Adjust metal aging and tarnish level",
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.01,
        markers: [0, 0.25, 0.5, 0.75, 1.0],
        onChange: (value: number) => {
            safeSet(() => {
                settings.store.brassTarnish = value;
                import("../components/WebGLSteampunkEffect.js").then(m => m.update());
            }, value);
        },
    },
    showSteampunkBackground: {
        type: OptionType.BOOLEAN,
        description: "Show the steampunk workshop background",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/SteampunkBackground.js").then(m => m.setup());
            } else {
                import("../components/SteampunkBackground.js").then(m => m.remove());
            }
        },
    },
});
