/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import * as GalaxyBackground from "./components/GalaxyBackground";
import { hideLoadingOverlay, showLoadingOverlay } from "./components/LoadingOverlay";
import * as MistEffect from "./components/MistEffect";
import * as StardustEffect from "./components/StardustEffect";
import * as SunMoonEffect from "./components/SunMoonEffect";
import { injectInfiniteStyles, removeInfiniteStyles, prefersReducedMotion } from "./utils/domUtils";
import { settings } from "./utils/settingsStore";

// Accessibility support
function checkAccessibilityPreferences(): void {
    try {
        const reducedMotion = prefersReducedMotion();

        if (reducedMotion) {
            console.log("Reduced motion preference detected, adjusting cosmic effects");

            // Reduce stardust count for accessibility
            if (settings.store.stardustCount > 50) {
                settings.store.stardustCount = 50;
            }

            // Reduce mist speed for accessibility
            if (settings.store.mistSpeed > 0.5) {
                settings.store.mistSpeed = 0.5;
            }

            // Show notification to user
            showAccessibilityNotification("Reduced motion detected. Some cosmic effects have been adjusted for accessibility.");
        }
    } catch (e) {
        console.warn("Failed to check accessibility preferences:", e);
    }
}

// Show accessibility notification
function showAccessibilityNotification(message: string): void {
    try {
        // Create a simple notification
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(40, 1, 55, 0.9);
            color: #ECF0F1;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid rgba(0, 71, 171, 0.5);
            z-index: 10002;
            font-size: 14px;
            max-width: 300px;
            backdrop-filter: blur(10px);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    } catch (error) {
        console.error("Failed to show accessibility notification:", error);
    }
}

// Show initialization error to user
function showInitializationError(error: any): void {
    try {
        const errorNotification = document.createElement("div");
        errorNotification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(155, 17, 30, 0.9);
            color: #ECF0F1;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid rgba(155, 17, 30, 0.8);
            z-index: 10002;
            font-size: 14px;
            max-width: 300px;
            backdrop-filter: blur(10px);
        `;
        errorNotification.textContent = `Infinite plugin failed to initialize: ${error.message || error}`;
        document.body.appendChild(errorNotification);

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorNotification.parentNode) {
                errorNotification.parentNode.removeChild(errorNotification);
            }
        }, 8000);
    } catch (notificationError) {
        console.error("Failed to show initialization error notification:", notificationError);
    }
}


export default definePlugin({
    name: "Infinite",
    description: "A cosmic plugin that adds infinite space effects with galaxy background to Discord",
    authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
    version: "2.0.0",

    // Enhanced Vencord plugin metadata
    enabledByDefault: false,
    required: false,

    settings,
    async start() {
        showLoadingOverlay("Initializing Infinite cosmic effects...");

        try {
            // 1. Check accessibility preferences first
            checkAccessibilityPreferences();

            // 2. Inject CSS styles
            await injectInfiniteStyles();

            // 3. Initialize components in parallel where possible
            const initPromises: Promise<any>[] = [];

            if (settings.store.showGalaxyBackground) {
                initPromises.push(GalaxyBackground.setup());
            }

            // Wait for async components to initialize
            await Promise.allSettled(initPromises);

            // Initialize synchronous components
            if (settings.store.enableMist) {
                MistEffect.setup();
            }

            if (settings.store.showSunAndMoon) {
                SunMoonEffect.start();
            }

            StardustEffect.start({
                count: settings.store.stardustCount,
                drift: settings.store.stardustDrift,
            });

            console.log("Infinite plugin initialized successfully");
        } catch (error) {
            console.error("Infinite plugin initialization failed:", error);
            // Show user notification about the error
            showInitializationError(error);
        } finally {
            // Always hide loading overlay
            hideLoadingOverlay();
        }
    },

    stop() {
        console.log("Infinite plugin stopped!");

        try {
            // Stop all components
            StardustEffect.stop();
            SunMoonEffect.stop();
            MistEffect.cleanup();
            GalaxyBackground.cleanup();

            // Remove CSS styles
            removeInfiniteStyles();

            console.log("Infinite plugin cleanup completed");
        } catch (error) {
            console.error("Error during Infinite plugin cleanup:", error);
        }
    },
});
