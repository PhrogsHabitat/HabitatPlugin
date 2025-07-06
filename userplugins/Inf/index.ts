/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, OptionType } from "@api/Settings";
import definePlugin from "@utils/types";

// Core color palette for the theme/plugin (internal use only)
const coreColors = [
    "#280137", // midnightPurple
    "#0047AB", // cobaltBlue
    "#9B111E", // rubyRed
    "#738595", // steelGray
    "#F1C40F", // yellow (I was wrong, this is actually yellow)
    "#ECF0F1", // Light (for moon/stardust)
];

// Named color variables for clarity
const midnightPurple = coreColors[0];
const cobaltBlue = coreColors[1];
const rubyRed = coreColors[2];
const steelGray = coreColors[3];
const sun = coreColors[4];
const moon = coreColors[5];

// Utility to get a color by index, cycling if out of range
function getCoreColor(idx: number): string {
    return coreColors[idx % coreColors.length];
}

// Utility to inject core colors as named CSS variables on :root
function injectCoreColorsAsCSSVars() {
    const root = document.documentElement;
    root.style.setProperty("--infPURP", midnightPurple);
    root.style.setProperty("--infBLUE", cobaltBlue);
    root.style.setProperty("--infRED", rubyRed);
    root.style.setProperty("--infWHITE", steelGray);
    root.style.setProperty("--infSUN", sun);
    root.style.setProperty("--infMOON", moon);
}

let currentStardust: {
    stardustOverlay: HTMLDivElement;
} | null = null;

let galaxyBackground: HTMLDivElement | null = null;

let sunElement: HTMLDivElement | null = null;
let moonElement: HTMLDivElement | null = null;
let sunMoonInterval: number | null = null;

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
    // Use core color as overlay tint
    galaxyBackground.style.backgroundColor = cobaltBlue + "33"; // 33 = ~20% alpha
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
        // Use core color as fallback background
        backgroundColor: sun,
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
        backgroundColor: moon,
    });

    document.body.appendChild(sunElement);
    document.body.appendChild(moonElement);

    updateSunAndMoonPosition();
    sunMoonInterval = setInterval(updateSunAndMoonPosition, 1000) as unknown as number;
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
        // Cycle through core colors for stardust
        const color = getCoreColor(i % coreColors.length);
        Object.assign(dust.style, {
            position: "absolute",
            left: `${left}vw`,
            top: `${top}vh`,
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: color + "40", // 40 = ~25% alpha
            boxShadow: `0 0 6px ${color}66`, // 66 = ~40% alpha
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

// Mist logic from HabitatRain
const mistConfigs = [
    { id: "mist0", image: "mistMid", zIndex: 1000, speedX: 42, amplitude: 70, freq: 0.08, scale: 1.2, alpha: 0.6, wrapWidth: 2000 },
    { id: "mist1", image: "mistMid", zIndex: 1000, speedX: 35, amplitude: 80, freq: 0.07, scale: 1.1, alpha: 0.6, wrapWidth: 2200 },
    { id: "mist2", image: "mistBack", zIndex: 1001, speedX: -20, amplitude: 60, freq: 0.09, scale: 1.3, alpha: 0.8, wrapWidth: 1800 },
    { id: "mist3", image: "mistMid", zIndex: 99, speedX: -12, amplitude: 70, freq: 0.07, scale: 0.9, alpha: 0.5, wrapWidth: 2400 },
    { id: "mist4", image: "mistBack", zIndex: 88, speedX: 10, amplitude: 50, freq: 0.08, scale: 0.8, alpha: 1, wrapWidth: 2600 },
    { id: "mist5", image: "mistMid", zIndex: 39, speedX: 5, amplitude: 100, freq: 0.02, scale: 1.4, alpha: 1, wrapWidth: 3000 }
];

const mistLayers: HTMLDivElement[] = [];
let mistTimer = 0;

// Instead of a single div per mist layer, use two for crossfade
const createMistLayer = (config: typeof mistConfigs[0]) => {
    const container = document.createElement("div");
    container.id = `inf-mist-container-${config.id}`;
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
    mistA.className = "inf-mist";
    mistA.style.position = "absolute";
    mistA.style.top = "0";
    mistA.style.left = "0";
    mistA.style.width = `${config.wrapWidth}px`;
    mistA.style.height = "130vh";
    mistA.style.backgroundImage = `url(https://phrogshabitat.github.io/${config.image}.png)`;
    mistA.style.backgroundRepeat = "repeat-x";
    mistA.style.backgroundSize = "auto 100%";
    mistA.style.opacity = config.alpha.toString();
    mistA.style.transform = `scale(${config.scale})`;
    mistA.style.transition = "opacity 0.6s linear";
    mistA.style.pointerEvents = "none";
    mistA.style.filter = "blur(1.2px)";
    mistA.style.maskImage = "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)";
    mistA.style.webkitMaskImage = "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)";

    const mistB = mistA.cloneNode() as HTMLDivElement;
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
};

const setupMistEffect = () => {
    if (mistLayers.length > 0) return;
    mistConfigs.forEach(config => {
        const layer = createMistLayer(config);
        mistLayers.push(layer);
    });
    handleMistResize();
};

const updateMist = (deltaTime: number) => {
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
};

const handleMistResize = () => {
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
};

const removeMist = () => {
    mistLayers.forEach(container => {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });
    mistLayers.length = 0;
};

const updateMistEffect = () => {
    mistLayers.forEach((layer, index) => {
        const baseAlpha = mistConfigs[index].alpha;
        layer.style.opacity = `${baseAlpha * settings.store.mistIntensity}`;
    });
};

const addInfStyles = () => {
    injectCoreColorsAsCSSVars();
    const style = document.createElement("style");
    style.textContent = `
        .stardust-overlay { pointer-events: none; z-index: 9999; }
        .stardust {
            position: absolute;
            border-radius: 50%;
            background: var(--infSUN, #ecf0f1);
            opacity: 0.25;
            box-shadow: 0 0 6px var(--infSUN, #ecf0f1);
            filter: blur(1px) brightness(1.2);
        }
        .inf-mist {
            pointer-events: none;
            will-change: transform;
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
        .sun {
            background: var(--infSUN, #f1c40f);
            filter: blur(2px) brightness(1.1);
        }
        .moon {
            background: var(--infMOON, #ecf0f1);
            filter: blur(1px) brightness(0.95);
        }
        .galaxy-background {
            background-color: var(--infPURP, #8e44ad);
            opacity: 0.2;
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
        onChange: () => StartStardust({ count: settings.store.stardustCount }),
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
        onChange: () => StartStardust({ drift: settings.store.stardustDrift }),
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
    showGalaxyBackground: {
        type: OptionType.BOOLEAN,
        description: "Show the galaxy background",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                setGalaxyBackground();
            } else {
                removeGalaxyBackground();
            }
        }
    },
    enableMist: {
        type: OptionType.BOOLEAN,
        description: "Enable or disable the mist effect.",
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                setupMistEffect();
            } else {
                removeMist();
            }
        },
    },
    mistIntensity: {
        type: OptionType.SLIDER,
        description: "Adjust mist density and visibility.",
        default: 0.7,
        markers: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1],
        onChange: () => updateMistEffect(),
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
        addInfStyles();
        if (settings.store.showGalaxyBackground) setGalaxyBackground();
        if (settings.store.showSunAndMoon) createSunAndMoon();
        StartStardust({ count: settings.store.stardustCount, drift: settings.store.stardustDrift });
        if (settings.store.enableMist) setupMistEffect();
        requestAnimationFrame(animateInfMist);
        window.addEventListener("resize", handleMistResize);
    },
    stop() {
        console.log("Infinite stopped!");
        StopStardust();
        removeGalaxyBackground();
        removeSunAndMoon();
        removeMist();
        window.removeEventListener("resize", handleMistResize);
    },
});

let lastFrameTime = performance.now();
function animateInfMist() {
    const now = performance.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    updateMist(deltaTime);
    requestAnimationFrame(animateInfMist);
}
