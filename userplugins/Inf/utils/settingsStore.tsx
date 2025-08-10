/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, OptionType } from "@api/Settings";

// Type declarations for dynamic imports
declare module "../components/StardustEffect" {
    export function updateStardust(): void;
}

declare module "../components/GalaxyBackground" {
    export function setup(): Promise<void>;
    export function cleanup(): void;
    export function updateOpacity(): void;
}

declare module "../components/SunMoonEffect" {
    export function start(): void;
    export function stop(): void;
}

declare module "../components/MistEffect" {
    export function setup(): void;
    export function cleanup(): void;
    export function updateIntensity(): void;
    export function updateSpeed(): void;
}

// Validation helper functions
function validateNumber(value: unknown, min: number, max: number, defaultValue: number): number {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
        console.warn(`Invalid setting value ${value}, using default ${defaultValue}`);
        return defaultValue;
    }
    return num;
}

export const settings = definePluginSettings({
    stardustCount: {
        type: OptionType.SLIDER,
        description: "Set the number of stardust particles (0 = none, 200 = max).",
        default: 100,
        markers: [0, 50, 100, 150, 200],
        onChange: (value: number) => {
            const validatedValue = validateNumber(value, 0, 200, 100);
            if (validatedValue !== value) {
                settings.store.stardustCount = validatedValue;
            }
            // Dynamic update will be handled by the component
            import("../components/StardustEffect").then(m => m.updateStardust());
        },
    },
    stardustDrift: {
        type: OptionType.SELECT,
        description: "Choose the drift animation for stardust particles.",
        options: [
            { label: "Up Drift", value: "up" },
            { label: "Down Drift", value: "down" },
            { label: "Float Drift", value: "float" },
        ],
        default: "float",
        onChange: () => {
            import("../components/StardustEffect").then(m => m.updateStardust());
        },
    },
    showGalaxyBackground: {
        type: OptionType.BOOLEAN,
        description: "Show the galaxy background image.",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/GalaxyBackground").then(m => m.setup());
            } else {
                import("../components/GalaxyBackground").then(m => m.cleanup());
            }
        },
    },
    galaxyOpacity: {
        type: OptionType.SLIDER,
        description: "Adjust the opacity of the galaxy background.",
        default: 0.5,
        markers: [0.1, 0.3, 0.5, 0.7, 1.0],
        onChange: () => {
            import("../components/GalaxyBackground").then(m => m.updateOpacity());
        },
    },
    showSunAndMoon: {
        type: OptionType.BOOLEAN,
        description: "Show the sun and moon celestial effects.",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/SunMoonEffect").then(m => m.start());
            } else {
                import("../components/SunMoonEffect").then(m => m.stop());
            }
        },
    },
    enableMist: {
        type: OptionType.BOOLEAN,
        description: "Enable cosmic mist effects.",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                import("../components/MistEffect").then(m => m.setup());
            } else {
                import("../components/MistEffect").then(m => m.cleanup());
            }
        },
    },
    mistIntensity: {
        type: OptionType.SLIDER,
        description: "Adjust the intensity of the cosmic mist.",
        default: 0.7,
        markers: [0.1, 0.3, 0.5, 0.7, 1.0],
        onChange: () => {
            import("../components/MistEffect").then(m => m.updateIntensity());
        },
    },
    mistSpeed: {
        type: OptionType.SLIDER,
        description: "Adjust the speed of the mist animation.",
        default: 1.0,
        markers: [0.1, 0.5, 1.0, 1.5, 2.0],
        onChange: () => {
            import("../components/MistEffect").then(m => m.updateSpeed());
        },
    },
    enableAccessibility: {
        type: OptionType.BOOLEAN,
        description: "Enable accessibility features (reduces motion for users with motion sensitivity).",
        default: true,
    },
});
