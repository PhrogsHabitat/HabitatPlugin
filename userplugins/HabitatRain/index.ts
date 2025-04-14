/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, OptionType } from "@api/Settings";
import definePlugin from "@utils/types";

let currentRain: {
    rainOverlay: HTMLDivElement;
    rainSound?: HTMLAudioElement;
    lightningInterval?: number;
} | null = null;

let forestBackground: HTMLVideoElement | null = null;


const defaultConfigs = {
    Soft: { numDrops: 30, fallSpeed: 0.5, angle: 0, sound: "https://cdn.pixabay.com/audio/2024/09/14/audio_536d210a78.mp3" },
    Heavy: { numDrops: 150, fallSpeed: 0.5, angle: 0, sound: "https://cdn.pixabay.com/audio/2022/04/16/audio_520eb6a5cc.mp3" },
    AngledR: { numDrops: 150, fallSpeed: 0.2, angle: 20, sound: "https://cdn.pixabay.com/audio/2024/11/03/audio_a64e97be33.mp3" },
    AngledL: { numDrops: 150, fallSpeed: 0.2, angle: -20, sound: "https://cdn.pixabay.com/audio/2024/11/03/audio_a64e97be33.mp3" },
};

const setForestBackground = () => {
    if (forestBackground) return;

    forestBackground = document.createElement("video");
    forestBackground.src = "https://phrogshabitat.github.io/forestShit.mp4";
    forestBackground.style.position = "fixed";
    forestBackground.style.top = "-75px"; // Adjusted to position the background up
    forestBackground.style.left = "0";
    forestBackground.style.width = "130vw";
    forestBackground.style.height = "130vh";
    forestBackground.style.objectFit = "cover";
    forestBackground.style.zIndex = "-1";
    forestBackground.autoplay = true;
    forestBackground.loop = true;
    forestBackground.muted = true;
    document.body.appendChild(forestBackground);
};

const removeForestBackground = () => {
    if (forestBackground) {
        forestBackground.remove();
        forestBackground = null;
    }
};

const StartRain = (preset: string = "Heavy", useLightning = true, useSound = true) => {
    if (currentRain) {
        StopRain();
    }

    const config = {
        numDrops: settings.store.numDrops,
        fallSpeed: settings.store.fallSpeed,
        angle: settings.store.angle,
        sound: settings.store.sound || defaultConfigs[preset].sound,
    };

    const rainOverlay = document.createElement("div");
    rainOverlay.className = "rain-overlay";
    rainOverlay.style.position = "fixed";
    rainOverlay.style.top = "0";
    rainOverlay.style.left = "0";
    rainOverlay.style.width = "100vw";
    rainOverlay.style.height = "100vh";
    rainOverlay.style.pointerEvents = "none";
    rainOverlay.style.zIndex = "9999";
    document.body.appendChild(rainOverlay);

    const screenHeight = window.innerHeight;
    for (let i = 0; i < config.numDrops; i++) {
        const raindrop = document.createElement("div");
        raindrop.className = "rain-drop";
        raindrop.style.position = "absolute";
        raindrop.style.top = `${Math.random() * 1}vh`;
        raindrop.style.left = `${Math.random() * 100}vw`;
        raindrop.style.width = "3px";
        raindrop.style.height = "40px";
        raindrop.style.backgroundColor = "rgba(173, 216, 230, 0.08)";

        const randomSpeed = config.fallSpeed + (Math.random() * 0.8 - 0.4); // Add random variation of ±0.4
        raindrop.style.animation = config.angle
            ? `fallDiagonal ${Math.random() * 0.2 + (screenHeight / 1000) * randomSpeed}s linear infinite`
            : `fall ${Math.random() * 0.2 + (screenHeight / 1000) * randomSpeed}s linear infinite`;

        if (config.angle) {
            raindrop.style.setProperty("--angle", config.angle.toString());
        }
        rainOverlay.appendChild(raindrop);
    }

    if (useLightning) {
        const lightning = () => {
            if (Math.random() < 0.1) {
                const flashIntensity = Math.random() * 0.8 + 0.2;
                const flashDuration = Math.random() * 200 + 100;
                rainOverlay.style.backgroundColor = `rgba(173, 216, 230, ${flashIntensity})`;
                setTimeout(() => {
                    rainOverlay.style.backgroundColor = "transparent";
                }, flashDuration);
            }
        };

        const lightningInterval = setInterval(lightning, Math.random() * 4000 + 2000);
        currentRain = { rainOverlay, lightningInterval: lightningInterval as unknown as number };
    }

    if (useSound) {
        const rainSound = new Audio(config.sound);
        rainSound.loop = true;
        rainSound.volume = settings.store.rainVolume / 100;
        rainSound.play().catch(err => console.error("Rain sound failed to play:", err));
        currentRain = { ...currentRain, rainSound };
    }

    currentRain = { ...currentRain, rainOverlay };
    console.log(`${preset} rain started with${useLightning ? "" : "out"} lightning and${useSound ? "" : "out"} sound.`);
};

const StopRain = () => {
    if (currentRain) {
        if (currentRain.rainSound) currentRain.rainSound.pause();
        if (currentRain.rainOverlay) currentRain.rainOverlay.remove();
        if (currentRain.lightningInterval) clearInterval(currentRain.lightningInterval);
        currentRain = null;
        console.log("Rain stopped!");
    } else {
        console.warn("No rain to stop!");
    }
};

const updateRainVolume = () => {
    if (currentRain?.rainSound) {
        currentRain.rainSound.volume = settings.store.rainVolume / 100;
        console.log("Rain volume updated to:", settings.store.rainVolume);
    }
};

const updatePresetSettings = (preset: string) => {
    const config = defaultConfigs[preset];
    if (config) {
        settings.store.numDrops = config.numDrops;
        settings.store.fallSpeed = config.fallSpeed;
        settings.store.angle = config.angle;
        settings.store.sound = config.sound;
        console.log("Preset settings applied:", preset);
    }
};

const addRainStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
        .rain-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999;
        }
        .rain-drop {
            position: absolute;
            background-color: rgba(173, 216, 230, 0.08);
        }
        @keyframes fall {
            to { transform: translateY(100vh); }
        }
        @keyframes fallDiagonal {
            to { transform: translateY(100vh) translateX(calc(var(--angle) * 1px)); }
        }
        @keyframes borderGlow {
            0% {
                outline-color: rgba(0, 255, 0, 0.5);
                outline-offset: -10px;
            }
            50% {
                outline-color: rgba(0, 255, 0, 1);
                outline-offset: -10px;
            }
            100% {
                outline-color: rgba(0, 255, 0, 0.5);
                outline-offset: -10px;
            }
        }
        
    `;
    document.head.appendChild(style);
};

const settings = definePluginSettings({
    rainVolume: {
        type: OptionType.SLIDER,
        description: "Adjust the rain sound volume (0 = mute, 100 = max).",
        default: 50,
        markers: [0, 25, 50, 75, 100],
        onChange: updateRainVolume,
    },
    numDrops: {
        type: OptionType.SLIDER,
        description: "Set the number of raindrops on the screen (0 = none, 500 = max).",
        default: 150,
        markers: [0, 100, 250, 400, 500],
        onChange: () => StartRain(settings.store.preset),
    },
    fallSpeed: {
        type: OptionType.SLIDER,
        description: "Control the speed of falling raindrops (0.1 = slow, 2 = fast).",
        default: 0.5,
        markers: [0.1, 0.5, 1, 1.5, 2],
        onChange: () => StartRain(settings.store.preset),
    },
    angle: {
        type: OptionType.SLIDER,
        description: "Adjust the angle of falling raindrops (-45 = left, 45 = right).",
        default: 0,
        markers: [-45, -30, 0, 30, 45],
        onChange: () => StartRain(settings.store.preset),
    },
    preset: {
        type: OptionType.SELECT,
        description: "Choose a rain preset to quickly apply settings.",
        options: [
            { label: "Heavy Rain", value: "Heavy" },
            { label: "Soft Rain", value: "Soft" },
            { label: "Angled Right Rain", value: "AngledR" },
            { label: "Angled Left Rain", value: "AngledL" },
        ],
        default: "Heavy",
        onChange: (preset: string) => {
            updatePresetSettings(preset);
            StartRain(preset);
        },
    },
    sound: {
        type: OptionType.STRING,
        description: "URL of the rain sound effect.",
        default: defaultConfigs.Heavy.sound,
        onChange: () => StartRain(settings.store.preset),
    },
    showForestBackground: {
        type: OptionType.BOOLEAN,
        description: "Show the forest background",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                setForestBackground();
            } else {
                removeForestBackground();
            }
        }
    }
});



export default definePlugin({
    name: "Habitat Rain",
    description: "A plugin that makes you feel at home in your habitat.",
    authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
    version: "2.0.0",
    settings,
    start() {
        console.log("HabitatRain started!");
        addRainStyles();
        if (settings.store.showForestBackground) setForestBackground();
        StartRain(settings.store.preset || "Heavy", true, true);
    },
    stop() {
        console.log("HabitatRain stopped!");
        StopRain();
        removeForestBackground();
    },
});
