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

export function setup() {
    if (mistLayers.length > 0) return;

    mistConfigs.forEach(config => {
        const layer = createLayer(config);
        mistLayers.push(layer);
    });

    handleResize();
}

export function remove() {
    mistLayers.forEach(container => {
        if (container.parentNode) container.parentNode.removeChild(container);
    });
    mistLayers = [];
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
        const wrapWidth = Math.max(window.innerWidth, window.innerHeight) * 2;
        const speed = config.speedX;
        const { scale } = config;
        const alpha = config.alpha * settings.store.mistIntensity;

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
