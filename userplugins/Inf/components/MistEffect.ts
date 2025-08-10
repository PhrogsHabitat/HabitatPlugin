/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ANIMATION, ASSETS, Z_INDEX } from "../utils/Constants";
import { createElement, prefersReducedMotion, removeElement } from "../utils/domUtils";
import { clamp } from "../utils/helpers";
import { settings } from "../utils/settingsStore";

interface MistLayerConfig {
    id: string;
    image: string;
    zIndex: number;
    speedX: number;
    amplitude: number;
    freq: number;
    scale: number;
    alpha: number;
    wrapWidth: number;
}

interface MistLayer {
    container: HTMLDivElement;
    mistA: HTMLDivElement;
    mistB: HTMLDivElement;
    config: MistLayerConfig;
    phase: number;
}

let mistLayers: MistLayer[] = [];
let mistTimer = 0;
let animationFrameId: number | null = null;
let isActive = false;

// Mist layer configurations adapted from the original
const mistConfigs: MistLayerConfig[] = [
    { id: "mist0", image: "MIST_MID", zIndex: Z_INDEX.MIST_MID, speedX: 42, amplitude: 70, freq: 0.08, scale: 1.2, alpha: 0.6, wrapWidth: 2000 },
    { id: "mist1", image: "MIST_MID", zIndex: Z_INDEX.MIST_MID, speedX: 35, amplitude: 80, freq: 0.07, scale: 1.1, alpha: 0.6, wrapWidth: 2200 },
    { id: "mist2", image: "MIST_BACK", zIndex: Z_INDEX.MIST_BACK, speedX: -20, amplitude: 60, freq: 0.09, scale: 1.3, alpha: 0.8, wrapWidth: 1800 },
    { id: "mist3", image: "MIST_MID", zIndex: Z_INDEX.MIST_MID, speedX: -12, amplitude: 70, freq: 0.07, scale: 0.9, alpha: 0.5, wrapWidth: 2400 },
    { id: "mist4", image: "MIST_BACK", zIndex: Z_INDEX.MIST_BACK, speedX: 10, amplitude: 50, freq: 0.08, scale: 0.8, alpha: 1, wrapWidth: 2600 },
    { id: "mist5", image: "MIST_FRONT", zIndex: Z_INDEX.MIST_FRONT, speedX: 5, amplitude: 100, freq: 0.02, scale: 1.4, alpha: 1, wrapWidth: 3000 }
];

/**
 * Sets up the cosmic mist effect
 */
export function setup(): void {
    if (isActive) {
        console.warn("Mist effect already active");
        return;
    }

    try {
        const reducedMotion = prefersReducedMotion();

        // Create mist layers
        mistConfigs.forEach(config => {
            const layer = createMistLayer(config, reducedMotion);
            mistLayers.push(layer);
        });

        // Handle initial resize
        handleResize();

        // Start animation loop if motion is allowed
        if (!reducedMotion) {
            startAnimationLoop();
        }

        isActive = true;
        console.log(`Mist effect setup complete with ${mistLayers.length} layers`);
    } catch (error) {
        console.error("Failed to setup mist effect:", error);
        cleanup();
        throw error;
    }
}

/**
 * Cleans up the mist effect
 */
export function cleanup(): void {
    if (!isActive) {
        return;
    }

    try {
        // Stop animation loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Remove all mist layers
        mistLayers.forEach(layer => {
            removeElement(layer.container);
        });

        mistLayers = [];
        mistTimer = 0;
        isActive = false;

        console.log("Mist effect cleaned up");
    } catch (error) {
        console.error("Failed to cleanup mist effect:", error);
        // Force cleanup
        mistLayers = [];
        isActive = false;
    }
}

/**
 * Updates the mist intensity based on settings
 */
export function updateIntensity(): void {
    if (!isActive) {
        return;
    }

    try {
        const intensity = clamp(settings.store.mistIntensity, 0, 1);

        mistLayers.forEach(layer => {
            const baseAlpha = layer.config.alpha;
            const newAlpha = baseAlpha * intensity;

            layer.mistA.style.opacity = newAlpha.toString();
            layer.mistB.style.opacity = newAlpha.toString();
        });

        console.log(`Mist intensity updated to ${intensity}`);
    } catch (error) {
        console.error("Failed to update mist intensity:", error);
    }
}

/**
 * Updates the mist animation speed
 */
export function updateSpeed(): void {
    if (!isActive) {
        return;
    }

    // Speed changes will be applied in the next animation frame
    console.log(`Mist speed updated to ${settings.store.mistSpeed}`);
}

/**
 * Creates a single mist layer with crossfade capability
 */
function createMistLayer(config: MistLayerConfig, reducedMotion: boolean): MistLayer {
    // Create container
    const container = createElement("div", {
        id: `inf-mist-container-${config.id}`,
        className: "inf-mist-container",
    }, {
        position: "fixed",
        top: "0",
        left: "0",
        width: `${config.wrapWidth * 2}px`,
        height: `${ANIMATION.MIST_HEIGHT_SCALE * 100}vh`,
        zIndex: config.zIndex.toString(),
        pointerEvents: "none",
        mixBlendMode: "screen",
        willChange: reducedMotion ? "auto" : "transform",
        overflow: "hidden",
    });

    // Create first mist element
    const mistA = createElement("div", {
        className: "inf-mist",
    }, {
        position: "absolute",
        top: "0",
        left: "0",
        width: `${config.wrapWidth}px`,
        height: `${ANIMATION.MIST_HEIGHT_SCALE * 100}vh`,
        backgroundImage: `url(${ASSETS[config.image as keyof typeof ASSETS]})`,
        backgroundRepeat: "repeat-x",
        backgroundSize: "auto 100%",
        opacity: config.alpha.toString(),
        transform: `scale(${config.scale})`,
        transition: reducedMotion ? "none" : "opacity 0.6s linear",
        pointerEvents: "none",
        filter: `blur(${ANIMATION.MIST_BLUR}px)`,
        maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        webkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
    });

    // Create second mist element for crossfade
    const mistB = mistA.cloneNode(true) as HTMLDivElement;
    mistB.style.left = `${config.wrapWidth}px`;
    mistB.style.opacity = "0";

    // Assemble the layer
    container.appendChild(mistA);
    container.appendChild(mistB);
    document.body.appendChild(container);

    return {
        container,
        mistA,
        mistB,
        config,
        phase: 0,
    };
}

/**
 * Starts the animation loop
 */
function startAnimationLoop(): void {
    let lastTime = performance.now();

    function animate(currentTime: number): void {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        updateMistAnimation(deltaTime);

        if (isActive) {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    animationFrameId = requestAnimationFrame(animate);
}

/**
 * Updates the mist animation
 */
function updateMistAnimation(deltaTime: number): void {
    if (!settings.store.enableMist || !mistLayers.length) {
        return;
    }

    mistTimer += deltaTime * 0.3 * settings.store.mistSpeed;

    mistLayers.forEach(layer => {
        const { config, mistA, mistB } = layer;
        const wrapWidth = Math.max(window.innerWidth, window.innerHeight) * 2;
        const speed = config.speedX * settings.store.mistSpeed;
        const { scale } = config;
        const alpha = config.alpha * settings.store.mistIntensity;

        // Calculate vertical oscillation
        const yOffset = Math.sin(mistTimer * config.freq) * config.amplitude;

        // Calculate horizontal movement
        const now = performance.now() / 1000;
        const totalWidth = wrapWidth;
        const x = -((now * speed) % totalWidth);
        const fadeProgress = ((now * speed) % totalWidth) / totalWidth;

        // Apply crossfade effect
        mistA.style.opacity = `${alpha * (1 - fadeProgress)}`;
        mistB.style.opacity = `${alpha * fadeProgress}`;

        // Apply transforms
        mistA.style.transform = `translateY(${yOffset}px) scale(${scale}) translateX(${x}px)`;
        mistB.style.transform = `translateY(${yOffset}px) scale(${scale}) translateX(${x + totalWidth}px)`;
    });
}

/**
 * Handles window resize events
 */
export function handleResize(): void {
    if (!isActive) {
        return;
    }

    try {
        mistLayers.forEach(layer => {
            const wrapWidth = Math.max(window.innerWidth, window.innerHeight) * 2;

            layer.container.style.width = `${wrapWidth * 2}px`;
            layer.mistA.style.width = `${wrapWidth}px`;
            layer.mistB.style.width = `${wrapWidth}px`;
            layer.mistB.style.left = `${wrapWidth}px`;
        });

        console.log("Mist effect handled resize");
    } catch (error) {
        console.error("Failed to handle mist resize:", error);
    }
}

/**
 * Checks if the mist effect is currently active
 */
export function isEffectActive(): boolean {
    return isActive;
}

/**
 * Gets the number of active mist layers
 */
export function getLayerCount(): number {
    return mistLayers.length;
}
