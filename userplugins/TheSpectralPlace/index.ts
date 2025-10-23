/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import * as DynamicEnvironment from "./components/DynamicEnvironment";
import { lightingSystem } from "./components/LightingSystem";
import { hideLoadingOverlay, showLoadingOverlay } from "./components/LoadingOverlay";
import * as MechanicalEffect from "./components/MechanicalEffect";
import { QuickActions } from "./components/QuickActions";
import * as SteampunkBackground from "./components/SteampunkBackground";
import { injectSteampunkStyles } from "./utils/domUtils";
import { settings } from "./utils/settingsStore";

let isPluginActive = false;
let quickActions: QuickActions | null = null;

export default definePlugin({
    name: "Steampunk Workshop",
    description: "A steampunk plugin that transforms Discord into a mechanical workshop.",
    authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
    version: "4.3.5",
    settings,
    async start() {
        try {
            isPluginActive = true;
            showLoadingOverlay();

            // 1. Inject CSS styles first
            await injectSteampunkStyles();

            // 2. Initialize components
            if (settings.store.showSteampunkBackground) await SteampunkBackground.setup();
            MechanicalEffect.start(settings.store.preset || "Moderate");
            if (settings.store.enableSteam) import("./components/SteamEffect.js").then(m => m.setup());
            if (settings.store.dynamicEnvironment) DynamicEnvironment.start();

            // 3. Add quick actions UI
            quickActions = new QuickActions();

            // 4. Hide loading overlay with delay
            setTimeout(hideLoadingOverlay, 500);
        } catch (e) {
            console.error("Error during Steampunk plugin start:", e);
        }
    },
    stop() {
        try {
            isPluginActive = false;
            hideLoadingOverlay();
            MechanicalEffect.stop();
            DynamicEnvironment.stop();
            SteampunkBackground.remove();
            import("./components/SteamEffect.js").then(m => m.remove());

            // Clean up lighting system
            lightingSystem.clearLights();

            // Clean up quick actions
            if (quickActions) {
                quickActions.remove();
                quickActions = null;
            }
        } catch (e) {
            console.error("Error during Steampunk plugin stop:", e);
        }
    },
});
