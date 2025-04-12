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

let currentStardust: {
    stardustOverlay: HTMLDivElement;
} | null = null;

let backgroundVideo: HTMLVideoElement | null = null;

let sunElement: HTMLDivElement | null = null;
let moonElement: HTMLDivElement | null = null;
let sunMoonInterval: number | null = null;

const defaultConfigs = {
    Soft: { numDrops: 30, fallSpeed: 0.5, angle: 0, sound: "https://cdn.pixabay.com/audio/2024/09/14/audio_536d210a78.mp3" },
    Heavy: { numDrops: 150, fallSpeed: 0.5, angle: 0, sound: "https://cdn.pixabay.com/audio/2022/04/16/audio_520eb6a5cc.mp3" },
    AngledR: { numDrops: 150, fallSpeed: 0.2, angle: 20, sound: "https://cdn.pixabay.com/audio/2024/11/03/audio_a64e97be33.mp3" },
    AngledL: { numDrops: 150, fallSpeed: 0.2, angle: -20, sound: "https://cdn.pixabay.com/audio/2024/11/03/audio_a64e97be33.mp3" },
};

const setBackgroundMedia = (url: string, isVideo: boolean) => {
    if (backgroundVideo) {
        backgroundVideo.remove();
        backgroundVideo = null;
    }

    if (isVideo) {
        backgroundVideo = document.createElement("video");
        backgroundVideo.src = url;
        backgroundVideo.style.position = "fixed";
        backgroundVideo.style.top = "0";
        backgroundVideo.style.left = "0";
        backgroundVideo.style.width = "100vw";
        backgroundVideo.style.height = "100vh";
        backgroundVideo.style.objectFit = "cover";
        backgroundVideo.style.zIndex = "-1";
        backgroundVideo.style.opacity = url === "https://phrogshabitat.github.io/infiniteShit.mp4" ? "0.5" : "1.0";
        backgroundVideo.autoplay = true;
        backgroundVideo.loop = true;
        backgroundVideo.muted = true;
        document.body.appendChild(backgroundVideo);
    } else {
        const backgroundImage = document.createElement("div");
        backgroundImage.style.position = "fixed";
        backgroundImage.style.top = "0";
        backgroundImage.style.left = "0";
        backgroundImage.style.width = "100vw";
        backgroundImage.style.height = "100vh";
        backgroundImage.style.backgroundImage = `url(${url})`;
        backgroundImage.style.backgroundSize = "cover";
        backgroundImage.style.backgroundPosition = "center";
        backgroundImage.style.zIndex = "-1";
        backgroundImage.style.opacity = url === "https://phrogshabitat.github.io/inf.webp" ? "0.5" : "1.0";
        document.body.appendChild(backgroundImage);
        backgroundVideo = backgroundImage as unknown as HTMLVideoElement; // Reuse the variable for consistency
    }
};

const setBackground = (type: string) => {
    if (type === "Habitat") {
        setBackgroundMedia("https://phrogshabitat.github.io/forestShit.mp4", true); // Video
    } else if (type === "Infinite") {
        setBackgroundMedia("https://phrogshabitat.github.io/inf.webp", false); // Image
    }
};

const removeBackgroundVideo = () => {
    if (backgroundVideo) {
        backgroundVideo.remove();
        backgroundVideo = null;
    }
};

const updateSunAndMoonPosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Calculate the percentage of the day that has passed
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const dayProgress = totalSeconds / 86400; // 86400 seconds in a day

    // Calculate positions
    const sunX = Math.cos((dayProgress + 0.5) * 2 * Math.PI) * 40 + 50; // Adjusted to stay on screen
    const sunY = Math.sin((dayProgress + 0.5) * 2 * Math.PI) * -40 + 50;

    const moonX = Math.cos(dayProgress * 2 * Math.PI) * 40 + 50; // Adjusted to stay on screen
    const moonY = Math.sin(dayProgress * 2 * Math.PI) * -40 + 50;

    // Clamp positions to ensure they stay within the viewport
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
        width: "200px", // Increase size
        height: "200px", // Increase size
        borderRadius: "50%",
        backgroundImage: "url('https://phrogshabitat.github.io/inf_sun.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        zIndex: "-2", // Move to background
        animation: "sun-wave 5s infinite", // Add heatwave effect
        transition: "top 2s linear, left 2s linear", // Smooth movement
        filter: "blur(2px)", // Slight blur for heatwave effect
    });

    moonElement = document.createElement("div");
    moonElement.className = "moon";
    Object.assign(moonElement.style, {
        position: "fixed",
        width: "150px", // Increase size
        height: "150px", // Increase size
        borderRadius: "50%",
        backgroundImage: "url('https://phrogshabitat.github.io/inf_moon.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        zIndex: "-2", // Move to background
        transition: "top 2s linear, left 2s linear", // Smooth movement
    });

    document.body.appendChild(sunElement);
    document.body.appendChild(moonElement);

    updateSunAndMoonPosition(); // Initial position update
    sunMoonInterval = setInterval(updateSunAndMoonPosition, 1000); // Update every second
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

const StartRain = (preset: string = "Heavy", useLightning = true, useSound = true) => {
    if (currentRain) {
        StopRain();
    }

    // Use the values from settings (these are dynamically updated)
    const config = {
        numDrops: settings.store.numDrops,
        fallSpeed: settings.store.fallSpeed,
        angle: settings.store.angle,
        sound: settings.store.sound || defaultConfigs[preset].sound, // Fallback to preset sound
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
        raindrop.style.animation = config.angle
            ? `fallDiagonal ${Math.random() * 0.2 + (screenHeight / 1000) * config.fallSpeed}s linear infinite`
            : `fall ${Math.random() * 0.2 + (screenHeight / 1000) * config.fallSpeed}s linear infinite`;
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
        rainSound.volume = settings.store.rainVolume / 100; // Read volume from settings
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

const StartStardust = ({
    count = settings.store.stardustCount,
    drift = settings.store.stardustDrift,
}: {
    count?: number;
    drift?: string;
} = {}) => {
    if (count > 200) {
        console.warn("Stardust count exceeds the maximum limit of 200. Adjusting to 200.");
        count = 200; // Cap the count at 200
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

const updateRainVolume = () => {
    if (currentRain?.rainSound) {
        currentRain.rainSound.volume = settings.store.rainVolume / 100; // Update volume dynamically
        console.log("Rain volume updated to:", settings.store.rainVolume);
    }
};

const updatePresetSettings = (preset: string) => {
    const config = defaultConfigs[preset];
    if (config) {
        settings.store.numDrops = config.numDrops;
        settings.store.fallSpeed = config.fallSpeed;
        settings.store.angle = config.angle;
        settings.store.sound = config.sound; // Update the sound
        console.log("Preset settings applied:", preset);
    }
};

const addStylesAndFilters = () => {
    const style = document.createElement("style");
    style.textContent += `
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

const start = () => {
    console.log("RainShaderPlugin started!");
    addStylesAndFilters();
    if (settings.store.showSunAndMoon) createSunAndMoon(); // Add sun and moon if enabled
    setBackground(settings.store.backgroundType || "Habitat"); // Set the background
    StartRain(settings.store.preset || "Heavy", true, true); // Start rain with selected preset
    StartStardust({ count: settings.store.stardustCount, drift: settings.store.stardustDrift }); // Start stardust
};

const stop = () => {
    console.log("RainShaderPlugin stopped!");
    StopRain();
    StopStardust();
    removeBackgroundVideo(); // Remove the background video
    removeSunAndMoon(); // Remove the sun and moon
};

const settings = definePluginSettings({
    rainVolume: {
        type: OptionType.SLIDER,
        description: "Adjust the rain sound volume (0 = mute, 100 = max).",
        default: 50,
        markers: [0, 25, 50, 75, 100],
        onChange: updateRainVolume, // Dynamically update volume
    },
    numDrops: {
        type: OptionType.SLIDER,
        description: "Set the number of raindrops on the screen (0 = none, 500 = max).",
        default: 150,
        markers: [0, 100, 250, 400, 500],
        onChange: () => StartRain(settings.store.preset), // Restart rain with updated settings
    },
    fallSpeed: {
        type: OptionType.SLIDER,
        description: "Control the speed of falling raindrops (0.1 = slow, 2 = fast).",
        default: 0.5,
        markers: [0.1, 0.5, 1, 1.5, 2],
        onChange: () => StartRain(settings.store.preset), // Restart rain with updated settings
    },
    angle: {
        type: OptionType.SLIDER,
        description: "Adjust the angle of falling raindrops (-45 = left, 45 = right).",
        default: 0,
        markers: [-45, -30, 0, 30, 45],
        onChange: () => StartRain(settings.store.preset), // Restart rain with updated settings
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
            StartRain(preset); // Apply preset and restart rain
        },
    },
    sound: {
        type: OptionType.STRING,
        description: "URL of the rain sound effect.",
        default: defaultConfigs.Heavy.sound,
        onChange: () => StartRain(settings.store.preset), // Restart rain with updated sound
    },
    stardustCount: {
        type: OptionType.SLIDER,
        description: "Set the number of stardust particles (0 = none, 200 = max).",
        default: 100,
        markers: [0, 50, 100, 150, 200],
        onChange: () => StartStardust({ count: settings.store.stardustCount }), // Restart stardust with updated settings
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
        onChange: () => StartStardust({ drift: settings.store.stardustDrift }), // Restart stardust with updated settings
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
            if (value === "enabled") {
                createSunAndMoon();
            } else {
                removeSunAndMoon();
            }
        },
    },
    backgroundType: {
        type: OptionType.SELECT,
        description: "Choose the background type.",
        options: [
            { label: "Habitat", value: "Habitat" },
            { label: "Infinite", value: "Infinite" },
        ],
        default: "Habitat",
        onChange: (value: string) => {
            setBackground(value);
        },
    },
});

export default definePlugin({
    name: "HabitatRain",
    description: "A Vencord Plugin made so you can enjoy Discord with a relaxing rain effect!",
    authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
    version: "1.3.0",
    settings, // Link settings to the plugin
    start,
    stop,
});

