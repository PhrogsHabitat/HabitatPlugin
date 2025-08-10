/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ANIMATION, COLORS, Z_INDEX } from "../utils/Constants";
import { createElement, prefersReducedMotion, removeElement } from "../utils/domUtils";
import { clamp } from "../utils/helpers";

interface CelestialBody {
    element: HTMLDivElement;
    size: number;
    phase: number; // Phase offset for positioning
}

interface SunMoonState {
    sun: CelestialBody | null;
    moon: CelestialBody | null;
    updateInterval: NodeJS.Timeout | null;
    isActive: boolean;
}

let sunMoonState: SunMoonState = {
    sun: null,
    moon: null,
    updateInterval: null,
    isActive: false,
};

/**
 * Starts the sun and moon celestial effects
 */
export function start(): void {
    if (sunMoonState.isActive) {
        console.warn("Sun and moon effects already active");
        return;
    }

    try {
        const reducedMotion = prefersReducedMotion();

        // Create sun element
        sunMoonState.sun = createCelestialBody("sun", {
            size: ANIMATION.SUN_MOON_SIZE,
            color: COLORS.SUN,
            imageUrl: "https://phrogshabitat.github.io/inf_sun.png",
            phase: -0.45, // Sun phase offset
            glowEffect: true,
            reducedMotion,
        });

        // Create moon element
        sunMoonState.moon = createCelestialBody("moon", {
            size: ANIMATION.SUN_MOON_SIZE * 0.75, // Moon is smaller
            color: COLORS.MOON,
            imageUrl: "https://phrogshabitat.github.io/inf_moon.png",
            phase: 0.10, // Moon phase offset (opposite to sun)
            glowEffect: false,
            reducedMotion,
        });

        // Add to DOM
        document.body.appendChild(sunMoonState.sun.element);
        document.body.appendChild(sunMoonState.moon.element);

        // Start position updates
        updatePositions();
        if (!reducedMotion) {
            sunMoonState.updateInterval = setInterval(updatePositions, 1000);
        }

        sunMoonState.isActive = true;
        console.log("Sun and moon effects started");
    } catch (error) {
        console.error("Failed to start sun and moon effects:", error);
        cleanup();
    }
}

/**
 * Stops the sun and moon effects
 */
export function stop(): void {
    if (!sunMoonState.isActive) {
        console.warn("Sun and moon effects not active");
        return;
    }

    cleanup();
    console.log("Sun and moon effects stopped");
}

/**
 * Updates the celestial body positions based on time
 */
function updatePositions(): void {
    if (!sunMoonState.isActive) {
        return;
    }

    try {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        const dayProgress = totalSeconds / 86400; // 24 hours in seconds

        // Update sun position
        if (sunMoonState.sun) {
            const sunPosition = calculateCelestialPosition(dayProgress, sunMoonState.sun.phase);
            updateElementPosition(sunMoonState.sun.element, sunPosition);
        }

        // Update moon position
        if (sunMoonState.moon) {
            const moonPosition = calculateCelestialPosition(dayProgress, sunMoonState.moon.phase);
            updateElementPosition(sunMoonState.moon.element, moonPosition);
        }
    } catch (error) {
        console.error("Failed to update celestial positions:", error);
    }
}

/**
 * Calculates the position of a celestial body based on time and phase
 */
function calculateCelestialPosition(dayProgress: number, phase: number): { x: number; y: number; } {
    const angle = (dayProgress + phase) * 2 * Math.PI;

    // Create an arc across the sky
    const x = Math.cos(angle) * 40 + 50; // 40% radius, centered at 50%
    const y = Math.sin(angle) * -40 + 50; // Negative for upward arc

    return {
        x: clamp(x, 5, 95), // Keep within viewport bounds
        y: clamp(y, 5, 95),
    };
}

/**
 * Updates the position of a celestial body element
 */
function updateElementPosition(element: HTMLDivElement, position: { x: number; y: number; }): void {
    element.style.left = `${position.x}%`;
    element.style.top = `${position.y}%`;
}

/**
 * Creates a celestial body (sun or moon)
 */
function createCelestialBody(type: "sun" | "moon", options: {
    size: number;
    color: string;
    imageUrl: string;
    phase: number;
    glowEffect: boolean;
    reducedMotion: boolean;
}): CelestialBody {
    const element = createElement("div", {
        className: `infinite-${type}`,
    }, {
        position: "fixed",
        width: `${options.size}px`,
        height: `${options.size}px`,
        borderRadius: "50%",
        backgroundImage: `url('${options.imageUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: options.color,
        zIndex: Z_INDEX.SUN_MOON.toString(),
        transition: options.reducedMotion ? "none" : "all 0.3s ease-in-out",
        filter: options.reducedMotion ? "none" : "blur(1px)",
        pointerEvents: "none",
    });

    // Add glow effect for sun
    if (options.glowEffect && !options.reducedMotion) {
        element.style.background = `radial-gradient(circle, ${options.color} 0%, rgba(241, 196, 15, 0.3) 70%, transparent 100%)`;
        element.style.boxShadow = `0 0 30px ${options.color}, 0 0 60px rgba(241, 196, 15, 0.5)`;
    } else if (!options.glowEffect && !options.reducedMotion) {
        element.style.background = `radial-gradient(circle, ${options.color} 0%, rgba(236, 240, 241, 0.3) 70%, transparent 100%)`;
        element.style.boxShadow = `0 0 20px ${options.color}, 0 0 40px rgba(236, 240, 241, 0.3)`;
    }

    return {
        element,
        size: options.size,
        phase: options.phase,
    };
}

/**
 * Checks if the sun and moon effects are active
 */
export function isActive(): boolean {
    return sunMoonState.isActive;
}

/**
 * Gets the current sun position (for external use)
 */
export function getSunPosition(): { x: number; y: number; } | null {
    if (!sunMoonState.sun) {
        return null;
    }

    const left = parseFloat(sunMoonState.sun.element.style.left) || 0;
    const top = parseFloat(sunMoonState.sun.element.style.top) || 0;

    return { x: left, y: top };
}

/**
 * Gets the current moon position (for external use)
 */
export function getMoonPosition(): { x: number; y: number; } | null {
    if (!sunMoonState.moon) {
        return null;
    }

    const left = parseFloat(sunMoonState.moon.element.style.left) || 0;
    const top = parseFloat(sunMoonState.moon.element.style.top) || 0;

    return { x: left, y: top };
}

/**
 * Forces an immediate position update
 */
export function forceUpdate(): void {
    updatePositions();
}

/**
 * Handles window resize events
 */
export function handleResize(): void {
    if (!sunMoonState.isActive) {
        return;
    }

    // Celestial bodies use percentage positioning, so they should automatically adjust
    // But we can trigger a position update if needed
    updatePositions();
}

/**
 * Cleanup function for emergency situations
 */
function cleanup(): void {
    try {
        if (sunMoonState.updateInterval) {
            clearInterval(sunMoonState.updateInterval);
            sunMoonState.updateInterval = null;
        }

        if (sunMoonState.sun) {
            removeElement(sunMoonState.sun.element);
            sunMoonState.sun = null;
        }

        if (sunMoonState.moon) {
            removeElement(sunMoonState.moon.element);
            sunMoonState.moon = null;
        }

        sunMoonState.isActive = false;
    } catch (error) {
        console.error("Error during sun/moon cleanup:", error);
        // Force reset state
        sunMoonState = {
            sun: null,
            moon: null,
            updateInterval: null,
            isActive: false,
        };
    }
}
