/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, OptionType } from "@api/Settings";
import definePlugin from "@utils/types";

let currentStardust: {
    stardustOverlay: HTMLDivElement;
} | null = null;

let galaxyBackground: HTMLDivElement | null = null;

let sunElement: HTMLDivElement | null = null;
let moonElement: HTMLDivElement | null = null;
let sunMoonInterval: number | null = null;

let isPluginActive = false; // Tracks whether the plugin is active

const setGalaxyBackground = () => {
    if (galaxyBackground) return;

    galaxyBackground = document.createElement("div");
    galaxyBackground.style.position = "fixed";
    galaxyBackground.style.top = "0";
    galaxyBackground.style.left = "0";
    galaxyBackground.style.width = "100vw";
    galaxyBackground.style.height = "100vh";
    galaxyBackground.style.backgroundImage = "url('https://phrogshabitat.github.io/inf.webp')";
    galaxyBackground.style.backgroundSize = "cover";
    galaxyBackground.style.backgroundPosition = "center";
    galaxyBackground.style.zIndex = "-1";
    galaxyBackground.style.opacity = "0.5";
    document.body.appendChild(galaxyBackground);
};

const removeGalaxyBackground = () => {
    if (galaxyBackground) {
        galaxyBackground.remove();
        galaxyBackground = null;
    }
};


const updateSunAndMoonPosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const dayProgress = totalSeconds / 86400;

    const sunX = Math.cos((dayProgress - 0.45) * 2 * Math.PI) * 40 + 50;
    const sunY = Math.sin((dayProgress - 0.45) * 2 * Math.PI) * -40 + 50;

    const moonX = Math.cos((dayProgress + 0.10) * 2 * Math.PI) * 40 + 50;
    const moonY = Math.sin((dayProgress + 0.10) * 2 * Math.PI) * -40 + 50;

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    if (sunElement) {
        sunElement.style.left = `${clamp(sunX, 5, 95)}%`;
        sunElement.style.top = `${clamp(sunY, 5, 95)}%`;
    }

    if (moonElement) {
        moonElement.style.left = `${clamp(moonX, 5, 95)}%`;
        moonElement.style.top = `${clamp(moonY, 5, 95)}%`;
    }
};

const createSunAndMoon = () => {
    if (sunElement || moonElement) return;

    sunElement = document.createElement("div");
    sunElement.className = "sun";
    Object.assign(sunElement.style, {
        position: "fixed",
        width: "200px",
        height: "200px",
        borderRadius: "50%",
        backgroundImage: "url('https://phrogshabitat.github.io/inf_sun.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        zIndex: "-2",
        animation: "sun-wave 5s infinite",
        transition: "top 2s linear, left 2s linear",
        filter: "blur(2px)",
    });

    moonElement = document.createElement("div");
    moonElement.className = "moon";
    Object.assign(moonElement.style, {
        position: "fixed",
        width: "150px",
        height: "150px",
        borderRadius: "50%",
        backgroundImage: "url('https://phrogshabitat.github.io/inf_moon.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        zIndex: "-2",
        transition: "top 2s linear, left 2s linear",
    });

    document.body.appendChild(sunElement);
    document.body.appendChild(moonElement);

    updateSunAndMoonPosition();
    sunMoonInterval = setInterval(updateSunAndMoonPosition, 1000);
};

const removeSunAndMoon = () => {
    if (sunElement) {
        sunElement.remove();
        sunElement = null;
    }
    if (moonElement) {
        moonElement.remove();
        moonElement = null;
    }
    if (sunMoonInterval) {
        clearInterval(sunMoonInterval);
        sunMoonInterval = null;
    }
};

const StartStardust = ({
    count = settings.store.stardustCount,
    drift = settings.store.stardustDrift,
}: {
    count?: number;
    drift?: string;
} = {}) => {
    if (count > 200) {
        console.warn("Stardust count exceeds the maximum limit of 200. Adjusting to 200.");
        count = 200;
    }

    if (currentStardust) StopStardust();

    const overlay = document.createElement("div");
    overlay.className = "stardust-overlay";
    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: "9999",
    });

    for (let i = 0; i < count; i++) {
        const dust = document.createElement("div");
        dust.className = "stardust";
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        Object.assign(dust.style, {
            position: "absolute",
            left: `${left}vw`,
            top: `${top}vh`,
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.25)",
            boxShadow: "0 0 6px rgba(255, 255, 255, 0.4)",
            filter: "blur(1px)",
            animation: `${drift || "float"}-drift ${8 + Math.random() * 6}s ease-in-out infinite`,
        });
        overlay.appendChild(dust);
    }

    document.body.appendChild(overlay);
    currentStardust = { stardustOverlay: overlay };
    console.log("Stardust effect started!");
};

const StopStardust = () => {
    if (currentStardust) {
        currentStardust.stardustOverlay.remove();
        currentStardust = null;
        console.log("Stardust effect stopped!");
    } else {
        console.warn("No stardust effect to stop!");
    }
};

const addInfStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
        .stardust-overlay { pointer-events: none; z-index: 9999; }
        .stardust {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.25);
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
            filter: blur(1px);
        }
        @keyframes up-drift {
            0% { transform: translateY(0); opacity: 0.4; }
            50% { transform: translateY(-40px); opacity: 1; }
            100% { transform: translateY(0); opacity: 0.4; }
        }
        @keyframes down-drift {
            0% { transform: translateY(0); opacity: 0.4; }
            50% { transform: translateY(40px); opacity: 1; }
            100% { transform: translateY(0); opacity: 0.4; }
        }
        @keyframes float-drift {
            0% { transform: translate(0, 0); opacity: 0.5; }
            25% { transform: translate(-10px, -10px); opacity: 0.8; }
            50% { transform: translate(10px, 10px); opacity: 0.8; }
            75% { transform: translate(-5px, 15px); opacity: 0.6; }
            100% { transform: translate(0, 0); opacity: 0.5; }
        }
        @keyframes sun-wave {
            0% { filter: blur(2px) brightness(1); transform: scale(1); }
            50% { filter: blur(4px) brightness(1.2); transform: scale(1.05); }
            100% { filter: blur(2px) brightness(1); transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
};

const settings = definePluginSettings({
    stardustCount: {
        type: OptionType.SLIDER,
        description: "Set the number of stardust particles (0 = none, 200 = max).",
        default: 100,
        markers: [0, 50, 100, 150, 200],
        onChange: () => {
            if (isPluginActive) StartStardust({ count: settings.store.stardustCount });
        },
    },
    stardustDrift: {
        type: OptionType.SELECT,
        description: "Choose the drift animation for stardust particles.",
        options: [
            { label: "Up Drift", value: "up" },
            { label: "Down Drift", value: "down" },
            { label: "Float Drift", value: "float" },
        ],
        default: "float",
        onChange: () => {
            if (isPluginActive) StartStardust({ drift: settings.store.stardustDrift });
        },
    },
    showSunAndMoon: {
        type: OptionType.SELECT,
        description: "Display a rotating sun and moon based on the system clock.",
        options: [
            { label: "Enabled", value: "enabled" },
            { label: "Disabled", value: "disabled" },
        ],
        default: "enabled",
        onChange: (value: string) => {
            if (isPluginActive) {
                if (value === "enabled") {
                    createSunAndMoon();
                } else {
                    removeSunAndMoon();
                }
            }
        },
    },
    showGalaxyBackground: {
        type: OptionType.BOOLEAN,
        description: "Show the galaxy background",
        default: true,
        onChange: (value: boolean) => {
            if (isPluginActive) {
                if (value) {
                    setGalaxyBackground();
                } else {
                    removeGalaxyBackground();
                }
            }
        },
    },
});

export default definePlugin({
    name: "Infinite",
    description: "A Vencord Plugin that adds cosmic effects with galaxy background to Discord",
    authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
    version: "1.3.0",
    settings,
    start() {
        console.log("Infinite started!");
        isPluginActive = true; // Mark plugin as active
        addInfStyles();
        if (settings.store.showGalaxyBackground) setGalaxyBackground();
        if (settings.store.showSunAndMoon) createSunAndMoon();
        StartStardust({ count: settings.store.stardustCount, drift: settings.store.stardustDrift });
    },
    stop() {
        console.log("Infinite stopped!");
        isPluginActive = false; // Mark plugin as inactive
        StopStardust();
        removeGalaxyBackground();
        removeSunAndMoon();
    },
});
