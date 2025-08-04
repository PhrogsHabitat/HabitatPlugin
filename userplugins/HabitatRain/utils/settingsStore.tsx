/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, OptionType } from "@api/Settings";
import { React } from "@webpack/common";

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
    dynamicWeather: {
        type: OptionType.BOOLEAN,
        description: "Enable dynamic weather simulation with realistic patterns",
        default: false,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/DynamicWeather").then(m => m.start());
            } else {
                import("../components/DynamicWeather").then(m => m.stop());
            }
        },
    },
    preset: {
        type: OptionType.SELECT,
        description: "Choose a rain preset to quickly apply settings.",
        options: [
            { label: "🌧️ Normal Rain", value: "Normal" },
            { label: "🌦️ Slow n' Comfy", value: "Slow" },
            { label: "⛈️ Heavy n' Relaxing", value: "Heavy" },
            { label: "🌧️💧 Downpouring Sadness", value: "Downpour" }
        ],
        default: "Heavy",
        onChange: (preset: string) => {
            import("../components/ThunderEffect").then(m => m.updatePresetSettings(preset));
        },
    },
    enableThunder: {
        type: OptionType.BOOLEAN,
        description: "Enable lightning effects during rain",
        default: true,
        onChange: (value: boolean) => {
            import("../components/ThunderEffect").then(m => value ? m.enableThunder() : m.disableThunder());
        },
    },
    enableMist: {
        type: OptionType.BOOLEAN,
        description: "Enable mist effects in the forest",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/MistEffect").then(m => m.setup());
            } else {
                import("../components/MistEffect").then(m => m.remove());
            }
        },
    },
    mistIntensity: {
        type: OptionType.SLIDER,
        description: "Adjust mist density and visibility",
        default: (defaultConfigs.Heavy.intensity * 0.7),
        min: 0,
        max: 3, // Lowered max for more realistic mist
        step: 0.01,
        markers: [0, 0.25, 0.5, 1, 1.5, 2, 2.5, 3],
        onChange: () => { /* see MistEffect for dynamic link to rain */ },
    },
    rainVolume: {
        type: OptionType.SLIDER,
        description: "Adjust rain sound volume",
        default: defaultConfigs.Heavy.volume,
        min: 0,
        max: 500,
        step: 1,
        markers: [0, 10, 25, 50, 75, 100, 200, 300, 400, 500],
        onChange: () => {
            import("../components/ThunderEffect").then(m => m.updateVolume());
        },
    },
    rainIntensity: {
        type: OptionType.SLIDER,
        description: "Adjust rain density",
        default: defaultConfigs.Heavy.intensity,
        min: 0,
        max: 5,
        step: 0.01,
        markers: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1, 2, 3, 4, 5],
        onChange: () => {
            import("../components/WebGLRainEffect").then(m => m.update());
        },
    },
    rainScale: {
        type: OptionType.NUMBER,
        description: "Adjust raindrop size",
        min: 0.05,
        max: 3.0, // Lowered max for less extreme scaling
        step: 0.01,
        onChange: (value: number) => { /* see WebGLRainEffect for dynamic link to mist */ },
    },
    rainAngle: {
        type: OptionType.SLIDER,
        description: "Adjust rain direction",
        default: 0,
        min: -180,
        max: 180,
        step: 1,
        markers: [-180, -90, -45, -15, 0, 15, 45, 90, 180],
        onChange: (value: number) => {
            safeSet(() => {
                settings.store.rainAngle = value;
                import("../components/WebGLRainEffect").then(m => m.update());
            }, value);
        },
    },
    rainSpeed: {
        type: OptionType.SLIDER,
        description: "Adjust rain speed",
        default: 1.0,
        min: 0.01,
        max: 10.0,
        step: 0.01,
        markers: [0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
        onChange: (value: number) => {
            safeSet(() => {
                settings.store.rainSpeed = value;
                import("../components/WebGLRainEffect").then(m => m.update());
            }, value);
        },
    },
    showForestBackground: {
        type: OptionType.BOOLEAN,
        description: "Show the animated forest background",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/ForestBackground").then(m => m.setup());
            } else {
                import("../components/ForestBackground").then(m => m.remove());
            }
        },
    },
    advancedSettings: {
        type: OptionType.COMPONENT,
        description: "Advanced Configuration",
        component: function AdvancedSettingsComponent() {
            // Use settings.store.resetWebGL to trigger reset
            return (
                <div style={{ padding: "10px", backgroundColor: "var(--background-secondary)" }}>
                    <div style={{ marginBottom: "10px" }}>
                        <h3 style={{ margin: 0 }}>Advanced Settings</h3>
                        <p style={{ margin: 0, opacity: 0.7 }}>Configure technical aspects of the plugin</p>
                    </div>
                    <div>
                        <button
                            style={{
                                background: "var(--button-background)",
                                color: "var(--button-text)",
                                border: "none",
                                padding: "5px 10px",
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                            onClick={() => {
                                settings.store.resetWebGL = true;
                            }}
                        >
                            Reset WebGL Context
                        </button>
                    </div>
                </div>
            );
        }
    },
    resetWebGL: {
        type: OptionType.BOOLEAN,
        description: "Internal: triggers WebGL context reset",
        default: false,
        hidden: true,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/WebGLRainEffect").then(m => m.reset());
                // Reset the flag so it can be triggered again
                setTimeout(() => { settings.store.resetWebGL = false; }, 100);
            }
        }
    }
});
