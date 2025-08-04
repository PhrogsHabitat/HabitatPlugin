/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import * as DynamicWeather from "./components/DynamicWeather";
import * as ForestBackground from "./components/ForestBackground";
import { hideLoadingOverlay, showLoadingOverlay } from "./components/LoadingOverlay";
import { QuickActions } from "./components/QuickActions";
import * as ThunderEffect from "./components/ThunderEffect";
import { injectHabitatStyles } from "./utils/domUtils";
import { settings } from "./utils/settingsStore";

let isPluginActive = false;
let quickActions: QuickActions | null = null;

export default definePlugin({
    name: "Habitat Rain",
    description: "A cozy plugin that makes you feel at home in the rain.",
    authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
    version: "4.3.5",
    settings,
    async start() {
        isPluginActive = true;
        showLoadingOverlay();

        // 1. Inject CSS styles first
        await injectHabitatStyles();

        // 2. Initialize components
        if (settings.store.showForestBackground) await ForestBackground.setup();
        ThunderEffect.start(settings.store.preset || "Heavy");
        if (settings.store.enableMist) import("./components/MistEffect").then(m => m.setup());
        if (settings.store.dynamicWeather) DynamicWeather.start();

        // 3. Add quick actions UI
        quickActions = new QuickActions();

        // 4. Hide loading overlay with delay
        setTimeout(hideLoadingOverlay, 500);
    },
    stop() {
        isPluginActive = false;
        hideLoadingOverlay();
        ThunderEffect.stop();
        DynamicWeather.stop();
        ForestBackground.remove();
        import("./components/MistEffect").then(m => m.remove());

        // Clean up quick actions
        if (quickActions) {
            quickActions.remove();
            quickActions = null;
        }
    },
});
