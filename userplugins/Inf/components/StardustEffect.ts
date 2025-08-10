/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ANIMATION, Z_INDEX } from "../utils/Constants";
import { createElement, prefersReducedMotion, removeElement } from "../utils/domUtils";
import { getCoreColor, getRandomDuration, getRandomPosition, validateStardustCount } from "../utils/helpers";
import { settings } from "../utils/settingsStore";

interface StardustParticle {
    element: HTMLDivElement;
    color: string;
    position: { x: number; y: number; };
    duration: number;
}

interface StardustState {
    overlay: HTMLDivElement;
    particles: StardustParticle[];
    isActive: boolean;
}

let currentStardust: StardustState | null = null;

/**
 * Starts the stardust effect with specified parameters
 */
export function start(options: {
    count?: number;
    drift?: string;
} = {}): void {
    const count = validateStardustCount(options.count ?? settings.store.stardustCount);
    const drift = options.drift ?? settings.store.stardustDrift ?? "float";

    if (currentStardust) {
        stop();
    }

    try {
        // Check accessibility preferences
        const reducedMotion = prefersReducedMotion();
        const effectiveCount = reducedMotion ? Math.min(count, 20) : count;

        // Create overlay container
        const overlay = createElement("div", {
            className: "stardust-overlay",
        }, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: Z_INDEX.STARDUST.toString(),
        });

        // Create particles
        const particles: StardustParticle[] = [];
        for (let i = 0; i < effectiveCount; i++) {
            const particle = createStardustParticle(i, drift, reducedMotion);
            particles.push(particle);
            overlay.appendChild(particle.element);
        }

        // Add to DOM
        document.body.appendChild(overlay);

        // Update state
        currentStardust = {
            overlay,
            particles,
            isActive: true,
        };

        console.log(`Stardust effect started with ${effectiveCount} particles (${drift} drift)`);
    } catch (error) {
        console.error("Failed to start stardust effect:", error);
        cleanup();
    }
}

/**
 * Stops the stardust effect
 */
export function stop(): void {
    if (!currentStardust) {
        console.warn("No stardust effect to stop");
        return;
    }

    try {
        removeElement(currentStardust.overlay);
        currentStardust = null;
        console.log("Stardust effect stopped");
    } catch (error) {
        console.error("Failed to stop stardust effect:", error);
        cleanup();
    }
}

/**
 * Updates the stardust effect with current settings
 */
export function updateStardust(): void {
    if (!currentStardust) {
        return;
    }

    // Restart with new settings
    start({
        count: settings.store.stardustCount,
        drift: settings.store.stardustDrift,
    });
}

/**
 * Checks if the stardust effect is currently active
 */
export function isActive(): boolean {
    return currentStardust?.isActive ?? false;
}

/**
 * Gets the current particle count
 */
export function getParticleCount(): number {
    return currentStardust?.particles.length ?? 0;
}

/**
 * Creates a single stardust particle
 */
function createStardustParticle(index: number, drift: string, reducedMotion: boolean): StardustParticle {
    const position = getRandomPosition();
    const color = getCoreColor(index);
    const duration = getRandomDuration(ANIMATION.STARDUST_MIN_DURATION, ANIMATION.STARDUST_MAX_DURATION);

    const element = createElement("div", {
        className: "stardust",
    }, {
        position: "absolute",
        left: `${position.x}vw`,
        top: `${position.y}vh`,
        width: `${ANIMATION.STARDUST_SIZE}px`,
        height: `${ANIMATION.STARDUST_SIZE}px`,
        borderRadius: "50%",
        background: `${color}40`, // 40 = ~25% alpha
        boxShadow: `0 0 6px ${color}66`, // 66 = ~40% alpha
        filter: `blur(${ANIMATION.STARDUST_BLUR}px)`,
        animation: reducedMotion ? "none" : `${drift}-drift ${duration}s ease-in-out infinite`,
        opacity: reducedMotion ? "0.2" : "0.25",
    });

    return {
        element,
        color,
        position,
        duration,
    };
}

/**
 * Updates particle colors (useful for theme changes)
 */
export function updateParticleColors(): void {
    if (!currentStardust) {
        return;
    }

    try {
        currentStardust.particles.forEach((particle, index) => {
            const newColor = getCoreColor(index);
            particle.color = newColor;
            particle.element.style.background = `${newColor}40`;
            particle.element.style.boxShadow = `0 0 6px ${newColor}66`;
        });

        console.log("Stardust particle colors updated");
    } catch (error) {
        console.error("Failed to update particle colors:", error);
    }
}

/**
 * Adjusts particle count dynamically
 */
export function adjustParticleCount(newCount: number): void {
    if (!currentStardust) {
        return;
    }

    const validatedCount = validateStardustCount(newCount);
    const currentCount = currentStardust.particles.length;

    if (validatedCount === currentCount) {
        return;
    }

    // Restart with new count for simplicity
    // In a more advanced implementation, we could add/remove particles dynamically
    start({
        count: validatedCount,
        drift: settings.store.stardustDrift,
    });
}

/**
 * Emergency cleanup function
 */
function cleanup(): void {
    if (currentStardust) {
        try {
            removeElement(currentStardust.overlay);
        } catch (error) {
            console.error("Error during stardust cleanup:", error);
        }
        currentStardust = null;
    }
}

/**
 * Handles window resize events
 */
export function handleResize(): void {
    if (!currentStardust) {
        return;
    }

    // Particles use viewport units, so they should automatically adjust
    // But we can trigger a refresh if needed
    console.log("Stardust effect handling resize");
}
