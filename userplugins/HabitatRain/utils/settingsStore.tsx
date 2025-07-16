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
        default: 0.7,
        markers: [0, 0.25, 0.5, 0.75, 1],
        onChange: () => {
            import("../components/MistEffect").then(m => m.update());
        },
    },
    rainVolume: {
        type: OptionType.SLIDER,
        description: "Adjust rain sound volume",
        default: defaultConfigs.Heavy.volume,
        markers: [0, 25, 50, 75, 100],
        onChange: () => {
            import("../components/ThunderEffect").then(m => m.updateVolume());
        },
    },
    rainIntensity: {
        type: OptionType.SLIDER,
        description: "Adjust rain density",
        default: defaultConfigs.Heavy.intensity,
        markers: [0, 0.25, 0.5, 0.75, 1],
        onChange: () => {
            import("../components/WebGLRainEffect").then(m => m.update());
        },
    },
    rainScale: {
        type: OptionType.SELECT,
        description: "Adjust raindrop size",
        options: [
            { label: "Tiny Drops", value: 0.5 },
            { label: "Small Drops", value: 1.0 },
            { label: "Medium Drops", value: 1.5 },
            { label: "Large Drops", value: 2.0 }
        ],
        default: 1.0, // Changed to number
        onChange: (value: number) => {
            safeSet(() => {
                settings.store.rainScale = value;
                import("../components/WebGLRainEffect").then(m => m.update());
            }, value);
        },
    },
    rainAngle: {
        type: OptionType.SELECT,
        description: "Adjust rain direction",
        options: [
            { label: "Left (↖)", value: -45 },
            { label: "Slight Left (←)", value: -15 },
            { label: "Straight (↓)", value: 0 },
            { label: "Slight Right (→)", value: 15 },
            { label: "Right (↗)", value: 45 }
        ],
        default: 0, // Changed to number
        onChange: (value: number) => {
            safeSet(() => {
                settings.store.rainAngle = value;
                import("../components/WebGLRainEffect").then(m => m.update());
            }, value);
        },
    },
    rainSpeed: {
        type: OptionType.SELECT,
        description: "Adjust rain speed",
        options: [
            { label: "Slow Motion", value: 0.5 },
            { label: "Gentle", value: 1.0 },
            { label: "Moderate", value: 1.5 },
            { label: "Heavy", value: 2.0 }
        ],
        default: 1.0, // Changed to number
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

// Ensure pluginName is set for Vencord settings compatibility
settings.pluginName = "HabitatRain";
