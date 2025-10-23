/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mistConfigs } from "../utils/configs";
import { ASSETS } from "../utils/Constants";
import { settings } from "../utils/settingsStore";

let mistLayers: HTMLDivElement[] = [];
let mistTimer = 0;
let rafId: number | null = null;
let lastFrameTime: number | null = null;
let globalTimer = 0; // For tracking overall time for sine waves

export function setup() {
    if (mistLayers.length > 0) return;
    if (!document?.body) {
        console.warn("MistEffect: document.body not available, skipping setup");
        return;
    }

    // Clear any existing layers first
    remove();

    // Create mist layers with varying properties
    mistConfigs.forEach((config, index) => {
        const layer = createLayer({
            ...config,
            speedX: config.speedX ?? (index % 2 === 0 ? 0.2 : -0.15) * (1 + index * 0.3),
            scale: config.scale ?? 0.8 + index * 0.1,
            zIndex: config.zIndex ?? 1000 - index * 10,
            alpha: config.alpha ?? Math.max(0.4, 1 - index * 0.15)
        });
        if (layer) mistLayers.push(layer);
    });

    handleResize();

    // Start animation loop
    lastFrameTime = performance.now();
    globalTimer = 0;
    if (mistLayers.length > 0) {
        rafId = requestAnimationFrame(mistFrame);
    }
}

export function remove() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    mistLayers.forEach(container => {
        if (container?.parentNode) {
            container.parentNode.removeChild(container);
        }
    });
    mistLayers = [];
    lastFrameTime = null;
}

export function update() {
    const { store } = settings;
    if (!store) return;

    mistLayers.forEach((container, index) => {
        const baseAlpha = mistConfigs[index]?.alpha ?? 0.5;
        const intensity = store.mistIntensity ?? 1;
        const enableMist = store.enableMist ?? false;

        if (container && container.style) {
            container.style.opacity = enableMist ? `${baseAlpha * intensity}` : "0";
        }
    });
}

function mistFrame(now: number) {
    if (!mistLayers.length || !settings.store?.enableMist) {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        return;
    }

    const delta = lastFrameTime ? (now - lastFrameTime) / 1000 : 0.016;
    lastFrameTime = now;

    animate(delta);
    rafId = requestAnimationFrame(mistFrame);
}

export function animate(deltaTime: number) {
    const { store } = settings;
    if (!store?.enableMist || !mistLayers.length) return;

    mistTimer += deltaTime * 0.3;
    globalTimer += deltaTime;

    mistLayers.forEach((container, index) => {
        const config = mistConfigs[index];
        if (!config) return;

        const mistA = (container as any)._mistA as HTMLDivElement;
        const mistB = (container as any)._mistB as HTMLDivElement;

        if (!mistA || !mistB) return;

        const wrapWidth = config.wrapWidth ?? Math.max(window.innerWidth, window.innerHeight) * 2;
        const speed = config.speedX ?? (index % 2 === 0 ? 0.2 : -0.15) * (1 + index * 0.3);
        const scale = config.scale ?? 0.8 + index * 0.1;
        const baseAlpha = config.alpha ?? Math.max(0.4, 1 - index * 0.15);
        const intensity = store.mistIntensity ?? 1;
        const enableMist = store.enableMist ?? false;

        if (!enableMist) return;

        const alpha = baseAlpha * intensity;

        // Customize sine wave movement based on layer index
        const freq = 0.3 - index * 0.05;
        const amplitude = 50 + index * 20;
        const phaseOffset = index * Math.PI / 4;
        const yOffset = Math.sin(globalTimer * freq + phaseOffset) * amplitude;

        const now = performance.now() / 1000;
        const totalWidth = wrapWidth;
        const x = -((now * speed) % totalWidth);
        const fadeProgress = ((now * speed) % totalWidth) / totalWidth;

        // Update mist A (leading layer)
        mistA.style.opacity = `${alpha * (1 - fadeProgress)}`;
        mistA.style.transform = `translateY(${yOffset}px) scale(${scale}) translateX(${x}px)`;

        // Update mist B (trailing layer)
        mistB.style.opacity = `${alpha * fadeProgress}`;
        mistA.style.filter = `blur(${1.2 + index * 0.3}px)`;
        mistB.style.filter = `blur(${1.2 + index * 0.3}px)`;
        mistB.style.transform = `translateY(${yOffset}px) scale(${scale}) translateX(${x + totalWidth}px)`;
    });
}

export function handleResize() {
    if (!mistLayers.length) return;

    const wrapBase = Math.max(window.innerWidth, window.innerHeight) * 2;

    mistLayers.forEach((container, index) => {
        const config = mistConfigs[index];
        if (!config || !container) return;

        const wrapWidth = config.wrapWidth ?? wrapBase;
        const mistA = (container as any)._mistA as HTMLDivElement;
        const mistB = (container as any)._mistB as HTMLDivElement;

        try {
            container.style.width = `${wrapWidth * 2}px`;
            container.style.height = "130vh";

            if (mistA) {
                mistA.style.width = `${wrapWidth}px`;
                mistA.style.height = "130vh";
            }
            if (mistB) {
                mistB.style.width = `${wrapWidth}px`;
                mistB.style.height = "130vh";
                mistB.style.left = `${wrapWidth}px`;
            }
        } catch (e) {
            console.warn("Mist resize error:", e);
        }
    });
}

function createLayer(config: typeof mistConfigs[0]) {
    if (!document?.body) return null;

    const cfg = config ?? {};
    const wrapWidth = cfg.wrapWidth ?? Math.max(window.innerWidth, window.innerHeight) * 2;

    const container = document.createElement("div");
    container.id = `habitat-mist-container-${cfg.id ?? Math.random().toString(36).slice(2)}`;

    // Container styles
    Object.assign(container.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: `${wrapWidth * 2}px`,
        height: "130vh",
        zIndex: (cfg.zIndex ?? -1).toString(),
        pointerEvents: "none",
        mixBlendMode: "screen",
        willChange: "transform",
        overflow: "hidden",
        opacity: "0", // Start hidden, will be set by update()
        transform: `translateY(${-50 + Math.random() * 100}px)` // Random initial position
    });

    function createMistElement() {
        const mist = document.createElement("div");
        const assetUrl = ASSETS?.[cfg.image as keyof typeof ASSETS] ?? "";

        Object.assign(mist.style, {
            position: "absolute",
            top: "0",
            left: "0",
            width: `${wrapWidth}px`,
            height: "130vh",
            backgroundImage: assetUrl ? `url(${assetUrl})` : "none",
            backgroundRepeat: "repeat-x",
            backgroundSize: "auto 100%",
            opacity: (cfg.alpha ?? 0.5).toString(),
            transform: `scale(${cfg.scale ?? 1})`,
            transition: "opacity 0.6s linear",
            pointerEvents: "none",
            filter: "blur(1.2px)",
            maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
            webkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
        } as CSSStyleDeclaration);

        return mist;
    }

    const mistA = createMistElement();
    const mistB = createMistElement();
    mistB.style.left = `${wrapWidth}px`;
    mistB.style.opacity = "0";

    container.appendChild(mistA);
    container.appendChild(mistB);

    // Store references for animation
    (container as any)._mistA = mistA;
    (container as any)._mistB = mistB;
    (container as any)._config = cfg;

    document.body.appendChild(container);
    return container;
}

// Add window resize listener
if (typeof window !== "undefined") {
    window.addEventListener("resize", handleResize);
}
