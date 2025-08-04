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

function mistFrame(now: number) {
    if (!mistLayers.length) return;
    const delta = (now - (lastFrameTime ?? now)) / 1000;
    lastFrameTime = now;
    animate(delta);
    rafId = requestAnimationFrame(mistFrame);
}

export function setup() {
    if (mistLayers.length > 0) return;

    mistConfigs.forEach(config => {
        const layer = createLayer(config);
        mistLayers.push(layer);
    });

    handleResize();

    // Start animation loop
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(mistFrame);
}

export function remove() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    mistLayers.forEach(container => {
        if (container.parentNode) container.parentNode.removeChild(container);
    });
    mistLayers = [];
    lastFrameTime = null;
}

export function update() {
    mistLayers.forEach((container, index) => {
        const baseAlpha = mistConfigs[index].alpha;
        container.style.opacity = `${baseAlpha * settings.store.mistIntensity}`;
    });
}

export function animate(deltaTime: number) {
    if (!settings.store.enableMist || !mistLayers.length) return;
    mistTimer += deltaTime * 0.3;

    mistLayers.forEach((container, index) => {
        const config = mistConfigs[index];
        const mistA = (container as any)._mistA as HTMLDivElement;
        const mistB = (container as any)._mistB as HTMLDivElement;
        const { wrapWidth, speedX: speed, scale, alpha: baseAlpha } = config;
        const alpha = baseAlpha * settings.store.mistIntensity;

        const yOffset = Math.sin(mistTimer * config.freq) * config.amplitude;
        const now = performance.now() / 1000;
        const totalWidth = wrapWidth;
        const x = -((now * speed) % totalWidth);
        const fadeProgress = ((now * speed) % totalWidth) / totalWidth;

        mistA.style.opacity = `${alpha * (1 - fadeProgress)}`;
        mistB.style.opacity = `${alpha * fadeProgress}`;
        mistA.style.transform = `translateY(${yOffset}px) scale(${scale}) translateX(${x}px)`;
        mistB.style.transform = `translateY(${yOffset}px) scale(${scale}) translateX(${x + totalWidth}px)`;
    });
}

export function handleResize() {
    mistLayers.forEach((container, index) => {
        const config = mistConfigs[index];
        const wrapWidth = Math.max(window.innerWidth, window.innerHeight) * 2;
        container.style.width = `${wrapWidth * 2}px`;
        const mistA = (container as any)._mistA as HTMLDivElement;
        const mistB = (container as any)._mistB as HTMLDivElement;
        mistA.style.width = `${wrapWidth}px`;
        mistB.style.width = `${wrapWidth}px`;
        mistB.style.left = `${wrapWidth}px`;
    });
}

// Helper to get dynamic mist factors based on rain
function getMistFactors() {
    const { rainIntensity } = settings.store;
    const { rainScale } = settings.store;
    // Mist density increases with rain intensity, but is reduced if rain scale is large (big drops = less mist)
    const density = Math.min(1.5, 0.5 + rainIntensity * 0.7 - (rainScale - 1) * 0.3);
    // Mist opacity is higher with more intense rain, but capped
    const opacity = Math.min(0.85, 0.3 + rainIntensity * 0.25);
    // Mist speed increases slightly with rain intensity
    const speed = 0.2 + rainIntensity * 0.15;
    return { density: Math.max(0, density), opacity: Math.max(0.1, opacity), speed };
}

export function renderMist(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const { density, opacity, speed } = getMistFactors();
    // Use these factors for mist rendering
    // Example:
    // ctx.globalAlpha = opacity;
    // for (let i = 0; i < density * 100; i++) { ... }
}

function createLayer(config: typeof mistConfigs[0]) {
    const container = document.createElement("div");
    container.id = `habitat-mist-container-${config.id}`;
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = `${config.wrapWidth * 2}px`;
    container.style.height = "130vh";
    container.style.zIndex = config.zIndex.toString();
    container.style.pointerEvents = "none";
    container.style.mixBlendMode = "screen";
    container.style.willChange = "transform";
    container.style.overflow = "hidden";

    const mistA = document.createElement("div");
    mistA.className = "habitat-mist";
    mistA.style.position = "absolute";
    mistA.style.top = "0";
    mistA.style.left = "0";
    mistA.style.width = `${config.wrapWidth}px`;
    mistA.style.height = "130vh";
    mistA.style.backgroundImage = `url(${ASSETS[config.image as keyof typeof ASSETS]})`;
    mistA.style.backgroundRepeat = "repeat-x";
    mistA.style.backgroundSize = "auto 100%";
    mistA.style.opacity = config.alpha.toString();
    mistA.style.transform = `scale(${config.scale})`;
    mistA.style.transition = "opacity 0.6s linear";
    mistA.style.pointerEvents = "none";
    mistA.style.filter = "blur(1.2px)";
    mistA.style.maskImage = "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)";
    mistA.style.webkitMaskImage = "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)";

    const mistB = mistA.cloneNode(true) as HTMLDivElement;
    mistB.style.left = `${config.wrapWidth}px`;
    mistB.style.opacity = "0";

    container.appendChild(mistA);
    container.appendChild(mistB);

    (container as any)._mistA = mistA;
    (container as any)._mistB = mistB;
    (container as any)._config = config;
    (container as any)._phase = 0;

    document.body.appendChild(container);
    return container;
}
