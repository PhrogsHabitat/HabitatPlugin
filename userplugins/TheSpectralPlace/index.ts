/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import * as CRTFilter from "./components/CRTFilter";
import * as GearAnimation from "./components/GearAnimation";
import { QuickActions } from "./components/QuickActions";
import * as SteamPipes from "./components/SteamPipesBackground";
import * as TerminalDisplay from "./components/TerminalDisplay";
import { injectSpectralStyles } from "./utils/domUtils";
import { settings } from "./utils/settingsStore";

export default definePlugin({
    name: "The Spectral Place",
    description: "SteamPunk + Retro themed environment",
    authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
    version: "1.0.0",
    settings,
    async start() {
        // Inject custom styles
        await injectSpectralStyles();

        // Initialize components
        if (settings.store.showSteamBackground) await SteamPipes.setup();
        if (settings.store.enableGears) GearAnimation.start();
        if (settings.store.enableCRTFilter) CRTFilter.apply();
        if (settings.store.enableTerminal) TerminalDisplay.start();

        // Add control panel
        new QuickActions();
    },
    stop() {
        // Cleanup all components
        GearAnimation.stop();
        SteamPipes.remove();
        CRTFilter.remove();
        TerminalDisplay.stop();
    }
});
