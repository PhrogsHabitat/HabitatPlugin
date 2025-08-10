/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ASSETS, COLORS, Z_INDEX } from "../utils/Constants";
import { createElement, removeElement } from "../utils/domUtils";
import { clamp } from "../utils/helpers";
import { settings } from "../utils/settingsStore";

let galaxyBackground: HTMLDivElement | null = null;
let isLoading = false;

/**
 * Sets up the galaxy background
 */
export async function setup(): Promise<void> {
    if (galaxyBackground) {
        console.warn("Galaxy background already exists");
        return;
    }

    if (isLoading) {
        console.warn("Galaxy background is already loading");
        return;
    }

    isLoading = true;

    try {
        // Create the background element
        galaxyBackground = createElement("div", {
            className: "infinite-galaxy-background",
        }, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100vw",
            height: "100vh",
            backgroundImage: `url('${ASSETS.GALAXY_BACKGROUND}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: Z_INDEX.GALAXY_BACKGROUND.toString(),
            opacity: "0",
            backgroundColor: `${COLORS.COBALT_BLUE}33`, // 33 = ~20% alpha overlay
            transition: "opacity 0.5s ease-in-out",
        });

        // Add to DOM
        document.body.appendChild(galaxyBackground);

        // Wait for image to load before showing
        await preloadBackgroundImage();

        // Fade in the background
        if (galaxyBackground) {
            galaxyBackground.style.opacity = settings.store.galaxyOpacity.toString();
        }

        console.log("Galaxy background setup complete");
    } catch (error) {
        console.error("Failed to setup galaxy background:", error);
        cleanup();
        throw error;
    } finally {
        isLoading = false;
    }
}

/**
 * Removes the galaxy background
 */
export function cleanup(): void {
    if (!galaxyBackground) {
        return;
    }

    try {
        // Fade out before removing
        galaxyBackground.style.opacity = "0";

        setTimeout(() => {
            if (galaxyBackground) {
                removeElement(galaxyBackground);
                galaxyBackground = null;
                console.log("Galaxy background removed");
            }
        }, 500); // Match the CSS transition duration

    } catch (error) {
        console.error("Failed to cleanup galaxy background:", error);
        // Force cleanup on error
        if (galaxyBackground) {
            removeElement(galaxyBackground);
            galaxyBackground = null;
        }
    }
}

/**
 * Updates the opacity of the galaxy background
 */
export function updateOpacity(): void {
    if (!galaxyBackground) {
        console.warn("Cannot update opacity: galaxy background not active");
        return;
    }

    try {
        const opacity = clamp(settings.store.galaxyOpacity, 0, 1);
        galaxyBackground.style.opacity = opacity.toString();
        console.log(`Galaxy background opacity updated to ${opacity}`);
    } catch (error) {
        console.error("Failed to update galaxy background opacity:", error);
    }
}

/**
 * Updates the background image
 */
export function updateBackgroundImage(imageUrl: string): void {
    if (!galaxyBackground) {
        console.warn("Cannot update image: galaxy background not active");
        return;
    }

    try {
        galaxyBackground.style.backgroundImage = `url('${imageUrl}')`;
        console.log("Galaxy background image updated");
    } catch (error) {
        console.error("Failed to update galaxy background image:", error);
    }
}

/**
 * Updates the overlay tint color
 */
export function updateTintColor(color: string, alpha = 0.2): void {
    if (!galaxyBackground) {
        console.warn("Cannot update tint: galaxy background not active");
        return;
    }

    try {
        const alphaHex = Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, "0");
        galaxyBackground.style.backgroundColor = `${color}${alphaHex}`;
        console.log(`Galaxy background tint updated to ${color} with ${alpha} alpha`);
    } catch (error) {
        console.error("Failed to update galaxy background tint:", error);
    }
}

/**
 * Checks if the galaxy background is currently active
 */
export function isActive(): boolean {
    return galaxyBackground !== null && galaxyBackground.parentNode !== null;
}

/**
 * Gets the current opacity value
 */
export function getCurrentOpacity(): number {
    if (!galaxyBackground) {
        return 0;
    }
    return parseFloat(galaxyBackground.style.opacity) || 0;
}

/**
 * Preloads the background image to ensure smooth display
 */
async function preloadBackgroundImage(): Promise<void> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            console.log("Galaxy background image preloaded successfully");
            resolve();
        };

        img.onerror = () => {
            const error = new Error("Failed to load galaxy background image");
            console.error(error.message);
            reject(error);
        };

        // Set a timeout to prevent infinite loading
        setTimeout(() => {
            if (!img.complete) {
                console.warn("Galaxy background image loading timed out, proceeding anyway");
                resolve();
            }
        }, 5000);

        img.src = ASSETS.GALAXY_BACKGROUND;
    });
}

/**
 * Handles window resize events
 */
export function handleResize(): void {
    if (!galaxyBackground) {
        return;
    }

    // Background uses viewport units, so it should automatically adjust
    // But we can trigger any necessary updates here
    console.log("Galaxy background handling resize");
}

/**
 * Applies a fade effect to the background
 */
export function fadeIn(duration = 500): void {
    if (!galaxyBackground) {
        return;
    }

    galaxyBackground.style.transition = `opacity ${duration}ms ease-in-out`;
    galaxyBackground.style.opacity = settings.store.galaxyOpacity.toString();
}

/**
 * Fades out the background
 */
export function fadeOut(duration = 500): void {
    if (!galaxyBackground) {
        return;
    }

    galaxyBackground.style.transition = `opacity ${duration}ms ease-in-out`;
    galaxyBackground.style.opacity = "0";
}
