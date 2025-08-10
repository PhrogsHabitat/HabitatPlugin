/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Z_INDEX } from "../utils/Constants";
import { createElement, removeElement } from "../utils/domUtils";

let loadingOverlay: HTMLDivElement | null = null;
let loadingTimeout: NodeJS.Timeout | null = null;

/**
 * Shows the loading overlay with cosmic theme
 */
export function showLoadingOverlay(message = "Initializing Infinite..."): void {
    if (loadingOverlay) {
        console.warn("Loading overlay already visible");
        return;
    }

    try {
        // Create main overlay container
        loadingOverlay = createElement("div", {
            className: "infinite-loading-overlay",
        }, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100vw",
            height: "100vh",
            background: "rgba(40, 1, 55, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: Z_INDEX.LOADING_OVERLAY.toString(),
            backdropFilter: "blur(5px)",
            transition: "opacity 0.3s ease-in-out",
            opacity: "0",
        });

        // Create content container
        const content = createElement("div", {
            className: "infinite-loading-content",
        }, {
            textAlign: "center",
            color: "#ECF0F1",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        });

        // Create spinner
        const spinner = createElement("div", {
            className: "infinite-loading-spinner",
        }, {
            width: "40px",
            height: "40px",
            border: "3px solid rgba(236, 240, 241, 0.3)",
            borderTop: "3px solid #ECF0F1",
            borderRadius: "50%",
            animation: "infinite-spin 1s linear infinite",
            margin: "0 auto 20px",
        });

        // Create message text
        const messageElement = createElement("div", {
            textContent: message,
        }, {
            fontSize: "16px",
            fontWeight: "500",
            marginBottom: "10px",
        });

        // Create subtitle
        const subtitle = createElement("div", {
            textContent: "Preparing cosmic effects...",
        }, {
            fontSize: "12px",
            opacity: "0.7",
        });

        // Assemble the overlay
        content.appendChild(spinner);
        content.appendChild(messageElement);
        content.appendChild(subtitle);
        loadingOverlay.appendChild(content);
        document.body.appendChild(loadingOverlay);

        // Fade in the overlay
        requestAnimationFrame(() => {
            if (loadingOverlay) {
                loadingOverlay.style.opacity = "1";
            }
        });

        // Auto-hide after 10 seconds as a safety measure
        loadingTimeout = setTimeout(() => {
            console.warn("Loading overlay auto-hiding after timeout");
            hideLoadingOverlay();
        }, 10000);

        console.log("Loading overlay shown");
    } catch (error) {
        console.error("Failed to show loading overlay:", error);
        // Clean up on error
        if (loadingOverlay) {
            removeElement(loadingOverlay);
            loadingOverlay = null;
        }
    }
}

/**
 * Hides the loading overlay with fade out animation
 */
export function hideLoadingOverlay(): void {
    if (!loadingOverlay) {
        return;
    }

    try {
        // Clear the auto-hide timeout
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
        }

        // Fade out animation
        loadingOverlay.style.opacity = "0";

        // Remove after animation completes
        setTimeout(() => {
            if (loadingOverlay) {
                removeElement(loadingOverlay);
                loadingOverlay = null;
                console.log("Loading overlay hidden");
            }
        }, 300); // Match the CSS transition duration

    } catch (error) {
        console.error("Failed to hide loading overlay:", error);
        // Force cleanup on error
        if (loadingOverlay) {
            removeElement(loadingOverlay);
            loadingOverlay = null;
        }
    }
}

/**
 * Updates the loading message
 */
export function updateLoadingMessage(message: string, subtitle?: string): void {
    if (!loadingOverlay) {
        console.warn("Cannot update loading message: overlay not visible");
        return;
    }

    try {
        const messageElement = loadingOverlay.querySelector(".infinite-loading-content div:nth-child(2)") as HTMLDivElement;
        const subtitleElement = loadingOverlay.querySelector(".infinite-loading-content div:nth-child(3)") as HTMLDivElement;

        if (messageElement) {
            messageElement.textContent = message;
        }

        if (subtitle && subtitleElement) {
            subtitleElement.textContent = subtitle;
        }
    } catch (error) {
        console.error("Failed to update loading message:", error);
    }
}

/**
 * Checks if the loading overlay is currently visible
 */
export function isLoadingOverlayVisible(): boolean {
    return loadingOverlay !== null && loadingOverlay.parentNode !== null;
}

/**
 * Forces cleanup of the loading overlay (for emergency situations)
 */
export function forceCleanupLoadingOverlay(): void {
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }

    if (loadingOverlay) {
        removeElement(loadingOverlay);
        loadingOverlay = null;
        console.log("Loading overlay force cleaned up");
    }
}
