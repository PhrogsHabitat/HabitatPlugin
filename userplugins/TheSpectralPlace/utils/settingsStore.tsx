/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, OptionType } from "@api/Settings";

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
    steamIntensity: {
        type: OptionType.SLIDER,
        description: "Steam pressure level",
        default: 50,
        markers: [0, 25, 50, 75, 100]
    },
    gearSpeed: {
        type: OptionType.SELECT,
        description: "Gear rotation speed",
        options: [
            { label: "🛞 Slow", value: "SLOW" },
            { label: "🛞 Medium", value: "MEDIUM" },
            { label: "🛞 Fast", value: "FAST" }
        ],
        default: "MEDIUM"
    },
    terminalTheme: {
        type: OptionType.SELECT,
        description: "Terminal color scheme",
        options: [
            { label: "🟠 Amber", value: "AMBER" },
            { label: "🟢 Green", value: "GREEN" },
            { label: "🔵 Blue", value: "BLUE" }
        ],
        default: "GREEN"
    },
    enableSoundEffects: {
        type: OptionType.BOOLEAN,
        description: "Enable mechanical sounds",
        default: true
    }
});
