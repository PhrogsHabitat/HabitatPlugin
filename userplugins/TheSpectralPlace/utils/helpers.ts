/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

export function waitForElement(selector: string): Promise<Element> {
    return new Promise(resolve => {
        const element = document.querySelector(selector);
        if (element) return resolve(element);

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
}

// Steampunk-specific helper functions
export function brassColor(tarnish: number): [number, number, number] {
    const baseBrass: [number, number, number] = [0.7, 0.5, 0.2];
    const tarnishColor: [number, number, number] = [0.3, 0.4, 0.3];

    return [
        baseBrass[0] + (tarnishColor[0] - baseBrass[0]) * tarnish,
        baseBrass[1] + (tarnishColor[1] - baseBrass[1]) * tarnish,
        baseBrass[2] + (tarnishColor[2] - baseBrass[2]) * tarnish
    ];
}

export function copperColor(age: number): [number, number, number] {
    const baseCopper: [number, number, number] = [0.8, 0.5, 0.2];
    const agedCopper: [number, number, number] = [0.4, 0.3, 0.2];

    return [
        baseCopper[0] + (agedCopper[0] - baseCopper[0]) * age,
        baseCopper[1] + (agedCopper[1] - baseCopper[1]) * age,
        baseCopper[2] + (agedCopper[2] - baseCopper[2]) * age
    ];
}

export function gearRotationSpeed(preset: string): number {
    switch (preset) {
        case "Gentle": return 0.3;
        case "Moderate": return 0.8;
        case "Industrial": return 1.5;
        case "Overdrive": return 2.5;
        default: return 1.0;
    }
}
