/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, OptionType } from "@api/Settings";
import definePlugin from "@utils/types";

let currentRain: {
    rainSound?: HTMLAudioElement;
    lightningInterval?: number;
    lightningOverlay?: HTMLDivElement;
} | null = null;

let forestBackground: HTMLVideoElement | null = null;
let rainCanvas: HTMLCanvasElement | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let texture: WebGLTexture | null = null;
let animationFrameId: number | null = null;
let startTime: number = 0;
let isContextLost = false;
const shouldReinitialize = false;

let reloadTimeout: NodeJS.Timeout | null = null;
let appMountObserver: MutationObserver | null = null;

let originalPushState: History["pushState"];

let isPluginActive = false; // Tracks whether the plugin is active

const defaultRainColor = [0.2, 0.3, 1.0]; // Bluish rain color

const thunderPool = [
    "https://phrogshabitat.github.io/thunder1.mp3",
    "https://phrogshabitat.github.io/thunder2.mp3",
    "https://phrogshabitat.github.io/thunder3.mp3",
    "https://phrogshabitat.github.io/thunder4.mp3",
    "https://phrogshabitat.github.io/thunder5.mp3",
];

const mistLayers: HTMLDivElement[] = [];
let mistTimer = 0;

const mistConfigs = [
    { id: "mist0", image: "mistMid", zIndex: 1000, speedX: 42, amplitude: 70, freq: 0.08, scale: 1.2, alpha: 0.6, wrapWidth: 2000 },
    { id: "mist1", image: "mistMid", zIndex: 1000, speedX: 35, amplitude: 80, freq: 0.07, scale: 1.1, alpha: 0.6, wrapWidth: 2200 },
    { id: "mist2", image: "mistBack", zIndex: 1001, speedX: -20, amplitude: 60, freq: 0.09, scale: 1.3, alpha: 0.8, wrapWidth: 1800 },
    { id: "mist3", image: "mistMid", zIndex: 99, speedX: -12, amplitude: 70, freq: 0.07, scale: 0.9, alpha: 0.5, wrapWidth: 2400 },
    { id: "mist4", image: "mistBack", zIndex: 88, speedX: 10, amplitude: 50, freq: 0.08, scale: 0.8, alpha: 1, wrapWidth: 2600 },
    { id: "mist5", image: "mistMid", zIndex: 39, speedX: 5, amplitude: 100, freq: 0.02, scale: 1.4, alpha: 1, wrapWidth: 3000 }
];

type WeatherPhase = "DRIZZLE" | "LIGHT_RAIN" | "HEAVY_RAIN" | "DOWNPOUR" | "THUNDERSTORM" | "CLEARING";
type TimeOfDay = "DAWN" | "MORNING" | "AFTERNOON" | "DUSK" | "NIGHT";
const WEATHER_CYCLE_DURATION = 45 * 60 * 1000; // 45 minutes per full cycle
const PHASE_TRANSITION_TIME = 5 * 60 * 1000; // 5 minutes for transitions
const MAX_WIND_SHIFT = 15; // Max degrees wind can shift per cycle
let dynamicWeatherInterval: NodeJS.Timeout | null = null;
let currentWeatherPhase: WeatherPhase = "LIGHT_RAIN";
let nextWeatherPhase: WeatherPhase = "LIGHT_RAIN";
let phaseStartTime: number = Date.now();
let phaseProgress: number = 0;
let currentWindDirection: number = -3; // Base wind direction in degrees
let isDynamicMode: boolean = false;
let weatherIntensity: number = 0.5;
let timeOfDay: TimeOfDay = "AFTERNOON";


const weatherPhaseConfigs: Record<WeatherPhase, { intensity: number; scale: number; speed: number; volume: number; mist: number; thunder: number; angleVariation: number; }> = {
    DRIZZLE: {
        intensity: 0.15,
        scale: 1.8,
        speed: 0.3,
        volume: 30,
        mist: 0.4,
        thunder: 0.01,
        angleVariation: 5
    },
    LIGHT_RAIN: {
        intensity: 0.35,
        scale: 1.4,
        speed: 0.5,
        volume: 45,
        mist: 0.55,
        thunder: 0.03,
        angleVariation: 7
    },
    HEAVY_RAIN: {
        intensity: 0.65,
        scale: 1.1,
        speed: 0.9,
        volume: 60,
        mist: 0.7,
        thunder: 0.07,
        angleVariation: 10
    },
    DOWNPOUR: {
        intensity: 0.95,
        scale: 0.9,
        speed: 1.4,
        volume: 75,
        mist: 0.9,
        thunder: 0.12,
        angleVariation: 12
    },
    THUNDERSTORM: {
        intensity: 0.85,
        scale: 1.0,
        speed: 1.7,
        volume: 85,
        mist: 0.95,
        thunder: 0.25,
        angleVariation: 15
    },
    CLEARING: {
        intensity: 0.1,
        scale: 2.2,
        speed: 0.2,
        volume: 15,
        mist: 0.25,
        thunder: 0.001,
        angleVariation: 3
    }
};

const timeOfDayConfigs: Record<TimeOfDay, { lightMod: number; color: [number, number, number]; mistMod: number; }> = {
    DAWN: {
        lightMod: 0.7,
        color: [0.3, 0.2, 0.4], // Purple-ish
        mistMod: 0.9
    },
    MORNING: {
        lightMod: 1.0,
        color: [0.2, 0.3, 1.0], // Standard blue
        mistMod: 0.7
    },
    AFTERNOON: {
        lightMod: 1.1,
        color: [0.25, 0.35, 1.0], // Slightly brighter blue
        mistMod: 0.6
    },
    DUSK: {
        lightMod: 0.6,
        color: [0.4, 0.2, 0.3], // Reddish
        mistMod: 0.85
    },
    NIGHT: {
        lightMod: 0.4,
        color: [0.15, 0.15, 0.3], // Dark blue
        mistMod: 1.0
    }
};

const determineNextPhase = (current: WeatherPhase): WeatherPhase => {
    const rand = Math.random();
    const hour = new Date().getHours();

    // More likely to have storms in afternoon
    const stormChance = hour >= 12 && hour <= 18 ? 0.4 : 0.2;

    // More likely to clear at night
    const clearingChance = hour >= 21 || hour <= 6 ? 0.5 : 0.2;

    switch (current) {
        case "DRIZZLE":
            return rand < 0.6 ? "LIGHT_RAIN" : "CLEARING";
        case "LIGHT_RAIN":
            if (rand < 0.3) return "DRIZZLE";
            if (rand < 0.6) return "HEAVY_RAIN";
            if (rand < stormChance + 0.6) return "THUNDERSTORM";
            return "CLEARING";
        case "HEAVY_RAIN":
            if (rand < 0.2) return "LIGHT_RAIN";
            if (rand < 0.5) return "DOWNPOUR";
            if (rand < stormChance + 0.5) return "THUNDERSTORM";
            return "CLEARING";
        case "DOWNPOUR":
            if (rand < 0.3) return "HEAVY_RAIN";
            if (rand < stormChance + 0.3) return "THUNDERSTORM";
            return "CLEARING";
        case "THUNDERSTORM":
            if (rand < 0.7) return "HEAVY_RAIN";
            return "CLEARING";
        case "CLEARING":
            return rand < clearingChance ? "DRIZZLE" : "LIGHT_RAIN";
        default:
            return "LIGHT_RAIN";
    }
};

const updateTimeOfDay = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 8) timeOfDay = "DAWN";
    else if (hour >= 8 && hour < 12) timeOfDay = "MORNING";
    else if (hour >= 12 && hour < 17) timeOfDay = "AFTERNOON";
    else if (hour >= 17 && hour < 21) timeOfDay = "DUSK";
    else timeOfDay = "NIGHT";
};

const updateWeatherParameters = () => {
    if (!isPluginActive || !isDynamicMode) return;

    const now = Date.now();
    const elapsed = now - phaseStartTime;
    phaseProgress = Math.min(elapsed / WEATHER_CYCLE_DURATION, 1);

    // Update time of day
    updateTimeOfDay();

    // Determine if we should transition to next phase
    if (phaseProgress >= 1) {
        currentWeatherPhase = nextWeatherPhase;
        nextWeatherPhase = determineNextPhase(currentWeatherPhase);
        phaseStartTime = now;
        phaseProgress = 0;

        // Gradually shift wind direction
        const phaseConfig = weatherPhaseConfigs[nextWeatherPhase];
        const maxShift = phaseConfig.angleVariation;
        currentWindDirection += (Math.random() * maxShift * 2) - maxShift;
        currentWindDirection = Math.max(-45, Math.min(45, currentWindDirection));
    }

    // Calculate transition progress (0-1)
    const transitionProgress = Math.min(elapsed / PHASE_TRANSITION_TIME, 1);
    const isTransitioning = transitionProgress < 1;

    // Get configs for current and next phases
    const currentConfig = weatherPhaseConfigs[currentWeatherPhase];
    const nextConfig = weatherPhaseConfigs[nextWeatherPhase];
    const timeConfig = timeOfDayConfigs[timeOfDay];

    // Apply time of day lighting
    if (gl && program) {
        const rainColorUniform = gl.getUniformLocation(program, "uRainColor");
        if (rainColorUniform) {
            gl.uniform3fv(rainColorUniform, timeConfig.color);
        }
    }

    // Interpolate between current and next phase during transition
    if (isTransitioning) {
        settings.store.rainIntensity = lerp(
            currentConfig.intensity,
            nextConfig.intensity,
            transitionProgress
        );

        settings.store.rainScale = lerp(
            currentConfig.scale,
            nextConfig.scale,
            transitionProgress
        );

        settings.store.rainSpeed = lerp(
            currentConfig.speed,
            nextConfig.speed,
            transitionProgress
        );

        settings.store.rainVolume = lerp(
            currentConfig.volume,
            nextConfig.volume,
            transitionProgress
        );

        settings.store.mistIntensity = lerp(
            currentConfig.mist,
            nextConfig.mist,
            transitionProgress
        );

        // Apply wind direction with time of day variation
        settings.store.rainAngle = currentWindDirection +
            (Math.sin(now / 60000) * currentConfig.angleVariation);
    }
    // Or just apply current phase with natural fluctuations
    else {
        // Natural fluctuations within the phase
        const fluctuationIntensity = 0.1;
        const timeVariation = Math.sin(now / 300000) * fluctuationIntensity;

        settings.store.rainIntensity = currentConfig.intensity +
            (timeVariation * currentConfig.intensity);

        settings.store.rainScale = currentConfig.scale +
            (timeVariation * 0.1);

        settings.store.rainSpeed = currentConfig.speed +
            (timeVariation * 0.2);

        // Apply wind direction with time of day variation
        settings.store.rainAngle = currentWindDirection +
            (Math.sin(now / 60000) * currentConfig.angleVariation);

        // Apply time of day mist effect
        settings.store.mistIntensity = currentConfig.mist * timeConfig.mistMod;
    }

    // Apply time of day lighting to rain
    weatherIntensity = settings.store.rainIntensity * timeConfig.lightMod;

    // Update thunder frequency based on phase
    settings.store.enableThunder = nextConfig.thunder > 0.05;
    if (currentRain?.lightningInterval) {
        clearInterval(currentRain.lightningInterval);
        currentRain.lightningInterval = undefined;
    }

    if (settings.store.enableThunder && currentRain) {
        const interval = Math.max(5000, 30000 - (nextConfig.thunder * 25000));
        const lightningInterval = setInterval(() => {
            if (Math.random() < nextConfig.thunder) {
                // Lightning flash implementation
            }
        }, interval) as unknown as number;

        currentRain.lightningInterval = lightningInterval;
    }

    // Update effects with new parameters
    updateRainVolume();
    updateRainEffect();
    updateMistEffect();
};

const lerp = (start: number, end: number, t: number): number => {
    return start + (end - start) * t;
};

const defaultConfigs = {
    Normal: {
        volume: 70,
        intensity: 0.5,
        scale: 1.2,
        angle: -3,
        speed: 0.5,
        thunderRarity: 0.05,
        sound: "https://phrogshabitat.github.io/RainSoft.mp3",
        mistIntensity: 0.7
    },
    Slow: {
        volume: 56,
        intensity: 0.14,
        scale: 2.0,
        angle: 0,
        speed: 0.4,
        thunderRarity: 0.02,
        sound: "https://phrogshabitat.github.io/RainSoft.mp3",
        mistIntensity: 0.4
    },
    Heavy: {
        volume: 56,
        intensity: 0.28,
        scale: 1.0,
        angle: 7.5,
        speed: 1.2,
        thunderRarity: 0.1,
        sound: "https://phrogshabitat.github.io/RainHeavy.mp3",
        mistIntensity: 0.85
    },
    Downpour: {
        volume: 70,
        intensity: 0.91,
        scale: 1.4,
        angle: 15,
        speed: 1.7,
        thunderRarity: 0.15,
        sound: "https://phrogshabitat.github.io/RainDownpour.mp3",
        mistIntensity: 1
    },
};

let contextLostCount = 0;
const MAX_RETRIES = 3;

// Instead of a single div per mist layer, use two for crossfade
const createMistLayer = (config: typeof mistConfigs[0]) => {
    // Container for both mist images
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

    // Two mist images for crossfade
    const mistA = document.createElement("div");
    mistA.className = "habitat-mist";
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
    mistA.style.filter = "blur(1.2px)"; // Increased blur for softer edges
    // Add mask to fade left/right edges and hide seams
    mistA.style.maskImage = "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)";
    mistA.style.webkitMaskImage = "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)";

    const mistB = mistA.cloneNode() as HTMLDivElement;
    mistB.style.left = `${config.wrapWidth}px`;
    mistB.style.opacity = "0";
    // mask/blur already set by cloneNode

    container.appendChild(mistA);
    container.appendChild(mistB);

    // Store refs for animation
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

// Update mist positions (vertical oscillation & crossfade)
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

        // Vertical oscillation
        const yOffset = Math.sin(mistTimer * config.freq) * config.amplitude;

        // Calculate horizontal offset for seamless loop
        const now = performance.now() / 1000;
        const totalWidth = wrapWidth;
        const x = -((now * speed) % totalWidth);

        // Crossfade progress: 0..1 over the loop
        const fadeProgress = ((now * speed) % totalWidth) / totalWidth;

        // Fade A out, B in
        mistA.style.opacity = `${alpha * (1 - fadeProgress)}`;
        mistB.style.opacity = `${alpha * fadeProgress}`;

        // Move both images
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

// Remove mist effect
const removeMist = () => {
    mistLayers.forEach(container => {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });
    mistLayers.length = 0;
};

const updateDynamicWeather = () => {
    if (!isPluginActive || !isDynamicMode) return;

    const now = new Date();
    const hour = now.getHours();
    let preset = "Slow";

    // Map times to weather presets
    if (hour >= 6 && hour < 9) preset = "Slow"; // Early morning - gentle rain
    else if (hour >= 9 && hour < 12) preset = "Normal"; // Late morning - normal rain
    else if (hour >= 12 && hour < 15) preset = "Heavy"; // Afternoon - heavy rain
    else if (hour >= 15 && hour < 18) preset = "Downpour"; // Late afternoon - intense downpour
    else if (hour >= 18 && hour < 21) preset = "Heavy"; // Evening - heavy rain
    else if (hour >= 21 || hour < 6) { // Night - gentle rain with more thunder
        preset = "Slow";
        settings.store.enableThunder = true;
        settings.store.mistIntensity = 0.85; // More mist at night
    }

    // Apply the preset
    updatePresetSettings(preset);
    StartRain(preset, true, true);
    console.log(`Dynamic weather updated to ${preset} for ${hour}:00`);
};

const startDynamicWeather = () => {
    if (dynamicWeatherInterval) clearInterval(dynamicWeatherInterval);
    isDynamicMode = true;

    // Initialize weather state
    phaseStartTime = Date.now();
    currentWeatherPhase = "LIGHT_RAIN";
    nextWeatherPhase = determineNextPhase(currentWeatherPhase);
    updateTimeOfDay();
    currentWindDirection = -3;

    // Start update loop
    dynamicWeatherInterval = setInterval(updateWeatherParameters, 10000); // Update every 10 seconds
    console.log("Dynamic weather simulation started");
};

const stopDynamicWeather = () => {
    if (dynamicWeatherInterval) {
        clearInterval(dynamicWeatherInterval);
        dynamicWeatherInterval = null;
    }
    isDynamicMode = false;
    console.log("Dynamic weather simulation stopped");
};


const setForestBackground = () => {
    if (forestBackground) return;

    forestBackground = document.createElement("video");
    forestBackground.src = "https://phrogshabitat.github.io/forestShit.mp4";
    forestBackground.style.position = "fixed";
    forestBackground.style.top = "0";
    forestBackground.style.left = "0";
    forestBackground.style.width = `${window.innerWidth}px`;
    forestBackground.style.height = `${window.innerHeight}px`;
    forestBackground.style.objectFit = "cover";
    forestBackground.style.zIndex = "-1";
    forestBackground.autoplay = true;
    forestBackground.loop = true;
    forestBackground.muted = true;
    forestBackground.crossOrigin = "anonymous";
    forestBackground.playsInline = true;

    document.body.appendChild(forestBackground);

    // Setup WebGL rain effect - will retry if needed
    setupRainEffect();

    // Handle video errors
    forestBackground.onerror = () => {
        console.error("Video failed to load. Retrying...");
        setTimeout(() => {
            if (forestBackground) {
                forestBackground.src = "https://phrogshabitat.github.io/forestShit.mp4?" + Date.now();
            }
        }, 2000);
    };

    if (settings.store.enableMist) {
        setupMistEffect();
    }
};

const setupRainEffect = () => {
    cleanupWebGL();

    if (!forestBackground || !isPluginActive || !settings.store.showForestBackground) {
        return;
    }

    rainCanvas = document.createElement("canvas");
    rainCanvas.id = `habitat-rain-canvas-${Date.now()}`; // Unique ID
    rainCanvas.style.position = "fixed";
    rainCanvas.style.top = "-75px";
    rainCanvas.style.left = "0";
    rainCanvas.style.width = "130vw";
    rainCanvas.style.height = "130vh";
    rainCanvas.style.objectFit = "cover";
    rainCanvas.style.zIndex = "-1";
    rainCanvas.width = window.innerWidth;
    rainCanvas.height = window.innerHeight;

    document.body.appendChild(rainCanvas);

    try {
        gl = rainCanvas.getContext("webgl", {
            preserveDrawingBuffer: false,
            antialias: false,
            failIfMajorPerformanceCaveat: false
        });

        if (!gl) {
            console.error("WebGL not supported");
            return;
        }

        rainCanvas.addEventListener("webglcontextlost", handleContextLost, false);
        rainCanvas.addEventListener("webglcontextrestored", handleContextRestored, false);

        // Create shaders with your original rain shader
        const vertexShaderSource = `
            attribute vec2 aPosition;
            varying vec2 vUv;
            void main() {
                gl_Position = vec4(aPosition, 0.0, 1.0);
                // Flip Y coordinate to fix upside-down issue
                vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec2 vUv;
            uniform sampler2D uTexture;
            uniform float uTime;
            uniform float uIntensity;
            uniform float uScale;
            uniform float uAngle;
            uniform float uSpeed; // New uniform for rain speed
            uniform vec2 uResolution;
            uniform vec3 uRainColor;

            // Your original simplex noise implementation
            vec3 mod289(vec3 x) {
                return x - floor(x * (1.0 / 289.0)) * 289.0;
            }

            vec4 mod289(vec4 x) {
                return x - floor(x * (1.0 / 289.0)) * 289.0;
            }

            vec4 permute(vec4 x) {
                return mod289(((x*34.0)+10.0)*x);
            }

            vec4 taylorInvSqrt(vec4 r) {
                return 1.79284291400159 - 0.85373472095314 * r;
            }

            float snoise(vec3 v) {
                const vec2  C = vec2(1.0/6.0, 1.0/3.0);
                const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);

                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);

                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;

                i = mod289(i);
                vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;

                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);

                vec4 x = x_ * ns.x + ns.yyyy;
                vec4 y = y_ * ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);

                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);

                vec4 s0 = floor(b0) * 2.0 + 1.0;
                vec4 s1 = floor(b1) * 2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));

                vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);

                vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;

                vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
                m = m * m;
                return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
            }

            // Your original rand function
            float rand(vec2 a) {
                return fract(sin(dot(mod(a, vec2(1000.0)), vec2(12.9898, 78.233))) * 43758.5453);
            }

            // Your original ease function
            float ease(float t) {
                return t * t * (3.0 - 2.0 * t);
            }

            // Your original rainDist function
            float rainDist(vec2 p, float scale, float intensity) {
                // Apply angle transformation
                float angleRad = radians(uAngle);
                mat2 rotation = mat2(cos(angleRad), -sin(angleRad), sin(angleRad), cos(angleRad));
                p = rotation * p;

                // scale everything
                p *= 0.1;
                // sheer
                p.x += p.y * 0.1;
                // scroll
                p.y -= uTime * 500.0 * uSpeed / scale; // Adjust scroll speed based on uSpeed
                // expand Y
                p.y *= 0.03;
                float ix = floor(p.x);
                // shift Y
                p.y += mod(ix, 2.0) * 0.5 + (rand(vec2(ix)) - 0.5) * 0.3;
                float iy = floor(p.y);
                vec2 index = vec2(ix, iy);
                // mod
                p -= index;
                // shift X
                p.x += (rand(index.yx) * 2.0 - 1.0) * 0.35;
                // distance
                vec2 a = abs(p - 0.5);
                float res = max(a.x * 0.8, a.y * 0.5) - 0.1;
                // decimate
                bool empty = rand(index) < mix(1.0, 0.1, intensity);
                return empty ? 1.0 : res;
            }

            void main() {
                vec2 wpos = vUv * uResolution;
                float intensity = uIntensity;

                vec3 add = vec3(0.0);
                float rainSum = 0.0;

                // Use only 2 layers for better performance
                const int numLayers = 2;
                float scales[2];
                scales[0] = 1.0;
                scales[1] = 1.8;

                for (int i = 0; i < numLayers; i++) {
                    float scale = scales[i];
                    float r = rainDist(wpos * scale / uScale + 500.0 * float(i), scale, intensity);
                    if (r < 0.0) {
                        float v = (1.0 - exp(r * 5.0)) / scale * 2.0;
                        wpos.x += v * 10.0 * uScale;
                        wpos.y -= v * 2.0 * uScale;
                        add += vec3(0.1, 0.15, 0.2) * v;
                        rainSum += (1.0 - rainSum) * 0.75;
                    }
                }

                vec2 sampleUV = wpos / uResolution;
                vec3 color = texture2D(uTexture, sampleUV).rgb;

                color += add;
                color = mix(color, uRainColor, 0.1 * rainSum);

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // Compile shaders
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            console.error("Failed to compile shaders");
            return;
        }

        // Create shader program
        program = gl.createProgram();
        if (!program) {
            console.error("Failed to create WebGL program");
            return;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Shader program link error:", gl.getProgramInfoLog(program));
            return;
        }

        gl.useProgram(program);

        // Create texture from video
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Set placeholder texture while video loads
        const placeholder = new Uint8Array([255, 0, 255, 255]); // Magenta placeholder
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);

        // Set up geometry
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);

        const positionAttribute = gl.getAttribLocation(program, "aPosition");
        gl.enableVertexAttribArray(positionAttribute);
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

        // Get uniform locations
        const textureUniform = gl.getUniformLocation(program, "uTexture");
        const timeUniform = gl.getUniformLocation(program, "uTime");
        const intensityUniform = gl.getUniformLocation(program, "uIntensity");
        const scaleUniform = gl.getUniformLocation(program, "uScale");
        const angleUniform = gl.getUniformLocation(program, "uAngle"); // New uniform location
        const speedUniform = gl.getUniformLocation(program, "uSpeed"); // New uniform location
        const resolutionUniform = gl.getUniformLocation(program, "uResolution");
        const rainColorUniform = gl.getUniformLocation(program, "uRainColor");

        // Set initial uniform values
        gl.uniform1i(textureUniform, 0);
        gl.uniform1f(intensityUniform, settings.store.rainIntensity);
        gl.uniform1f(scaleUniform, settings.store.rainScale);
        gl.uniform1f(angleUniform, settings.store.rainAngle); // Set rain angle
        gl.uniform1f(speedUniform, settings.store.rainSpeed); // Set rain speed
        gl.uniform2f(resolutionUniform, rainCanvas.width, rainCanvas.height);
        gl.uniform3fv(rainColorUniform, defaultRainColor);

        // Start animation loop
        startTime = performance.now();
        animationFrameId = requestAnimationFrame(animateRainEffect);

        console.log("WebGL rain effect initialized successfully");
        contextLostCount = 0;
    } catch (e) {
        console.error("WebGL initialization failed:", e);
        contextLostCount++;

        if (contextLostCount < MAX_RETRIES) {
            console.log(`Retrying WebGL setup (attempt ${contextLostCount + 1}/${MAX_RETRIES})`);
            setTimeout(setupRainEffect, 1000);
        } else {
            console.error("Max WebGL retries reached. Giving up.");
        }
    }
};

const handleContextLost = (event: Event) => {
    event.preventDefault();
    console.warn("WebGL context lost. Scheduling restoration.");
    isContextLost = true;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    setTimeout(() => {
        if (isPluginActive && settings.store.showForestBackground) {
            console.log("Attempting WebGL restoration");
            setupRainEffect();
        }
    }, 2000 + contextLostCount * 1000); // Backoff
};

const handleContextRestored = () => {
    console.log("WebGL context restored");
    isContextLost = false;
    contextLostCount = 0;
};

const handleDiscordReload = () => {
    if (!isPluginActive || !settings.store.showForestBackground) return;

    console.log("Detected Discord reload, reinitializing context");

    // Clean up WebGL but keep video reference
    cleanupWebGL();

    // Reinitialize video
    reinitializeVideo();

    // Reinitialize WebGL if context is available
    if (!isContextLost) {
        setTimeout(() => {
            if (settings.store.showForestBackground) {
                setupRainEffect();
            }
        }, 500);
    }
};

const setupDiscordReloadDetection = () => {
    // Clean up any existing observer
    if (appMountObserver) {
        appMountObserver.disconnect();
        appMountObserver = null;
    }

    // Watch for app-mount element changes
    appMountObserver = new MutationObserver(() => {
        if (!document.getElementById("app-mount")) {
            // App mount was removed - Discord is reloading
            if (isPluginActive) {
                console.log("Detected Discord reload starting");

                // Clean up everything
                StopRain();
                removeForestBackground();

                // Wait for Discord to finish reloading
                reloadTimeout = setTimeout(() => {
                    console.log("Reinitializing plugin after Discord reload");
                    if (isPluginActive) {
                        if (settings.store.showForestBackground) setForestBackground();
                        StartRain(settings.store.preset || "Heavy", true, true);
                    }
                }, 4000);
            }
        }
    });

    // Start observing the document body
    if (document.body) {
        appMountObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
};

// Add this helper function to wait for Discord to stabilize
const waitForDiscordStable = (): Promise<void> => {
    return new Promise(resolve => {
        if (document.getElementById("app-mount")) {
            return resolve();
        }

        const observer = new MutationObserver(() => {
            if (document.getElementById("app-mount")) {
                observer.disconnect();
                resolve();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
};

const cleanupWebGL = () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Don't attempt to delete WebGL resources - just remove canvas
    if (rainCanvas && rainCanvas.parentNode) {
        rainCanvas.parentNode.removeChild(rainCanvas);
        rainCanvas = null;
    }

    program = null;
    texture = null;
    gl = null;
};

const reinitializeVideo = () => {
    if (forestBackground && document.body.contains(forestBackground)) {
        // Video is still in DOM, just restart it
        forestBackground.play().catch(e => console.error("Video restart error:", e));
        return;
    }

    // Video was removed, recreate it
    removeForestBackground();
    setForestBackground();
};

const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
};

let lastFrameTime = performance.now();

const animateRainEffect = () => {
    // If context is lost, reinitialize everything
    if (isContextLost) {
        console.log("Reinitializing after context loss");
        removeForestBackground();
        setForestBackground();
        isContextLost = false;
        return;
    }

    // Stop if context is lost or resources are missing
    if (!gl || !program || !rainCanvas || !forestBackground) {
        return;
    }

    try {
        // Only update texture if video is ready
        if (forestBackground.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, forestBackground);
        }

        // Update uniforms
        const timeUniform = gl.getUniformLocation(program, "uTime");
        const intensityUniform = gl.getUniformLocation(program, "uIntensity");
        const scaleUniform = gl.getUniformLocation(program, "uScale");
        const angleUniform = gl.getUniformLocation(program, "uAngle");
        const speedUniform = gl.getUniformLocation(program, "uSpeed");

        if (timeUniform) gl.uniform1f(timeUniform, (performance.now() - startTime) / 1000);
        if (intensityUniform) gl.uniform1f(intensityUniform, settings.store.rainIntensity);
        if (scaleUniform) gl.uniform1f(scaleUniform, settings.store.rainScale);
        if (angleUniform) gl.uniform1f(angleUniform, settings.store.rainAngle); // Update rain angle
        if (speedUniform) gl.uniform1f(speedUniform, settings.store.rainSpeed); // Update rain speed

        // Render
        gl.viewport(0, 0, rainCanvas.width, rainCanvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Update mist position
        const now = performance.now();
        const deltaTime = (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        updateMist(deltaTime);

    } catch (e) {
        console.error("Error in animation loop:", e);
        // Don't schedule next frame
        return;
    }

    // Schedule next frame
    animationFrameId = requestAnimationFrame(animateRainEffect);
};

const removeForestBackground = () => {
    cleanupWebGL();

    if (forestBackground && forestBackground.parentNode) {
        forestBackground.pause();
        forestBackground.parentNode.removeChild(forestBackground);
        forestBackground = null;
    }

    removeMist();
};

const updatePresetSettings = (preset: string) => {
    const config = defaultConfigs[preset];
    if (config) {
        settings.store.rainVolume = config.volume;
        settings.store.rainIntensity = config.intensity;
        settings.store.rainScale = config.scale;
        settings.store.rainAngle = config.angle;
        settings.store.rainSpeed = config.speed;
        settings.store.sound = config.sound;
        settings.store.mistIntensity = config.mistIntensity; // Apply mist intensity

        if (isPluginActive && settings.store.enableMist) {
            updateMistEffect();
        }

        console.log("Preset settings applied:", preset);
    } else {
        console.warn("Invalid preset:", preset);
    }
};

const StartRain = (preset: string = "Heavy", useLightning = true, useSound = true) => {
    if (currentRain) {
        StopRain();
    }

    updatePresetSettings(preset); // Apply preset settings

    const config = defaultConfigs[preset];
    const lightningOverlay = document.createElement("div");

    if (useLightning && settings.store.enableThunder) { // Ensure thunder is only initialized if enabled
        lightningOverlay.style.position = "fixed";
        lightningOverlay.style.top = "0";
        lightningOverlay.style.left = "0";
        lightningOverlay.style.width = "100vw";
        lightningOverlay.style.height = "100vh";
        lightningOverlay.style.pointerEvents = "none";
        lightningOverlay.style.zIndex = "10000";
        lightningOverlay.style.backgroundColor = "transparent";
        lightningOverlay.style.transition = "background 0.1s ease";
        document.body.appendChild(lightningOverlay);

        const lightning = () => {
            if (settings.store.enableThunder && Math.random() < config.thunderRarity) { // Check enableThunder here
                const flashIntensity = Math.random() * 0.7 + 0.3;
                lightningOverlay.style.backgroundColor = `rgba(173, 216, 230, ${flashIntensity})`;

                // Play a random thunder sound from the pool
                const thunderSound = new Audio(thunderPool[Math.floor(Math.random() * thunderPool.length)]);
                thunderSound.volume = settings.store.rainVolume / 100;
                thunderSound.play().catch(err => console.error("Thunder sound failed to play:", err));

                setTimeout(() => {
                    lightningOverlay.style.backgroundColor = "transparent";
                }, 100);
            }
        };

        const lightningInterval = setInterval(lightning, Math.random() * 4000 + 2000);
        currentRain = { lightningOverlay, lightningInterval: lightningInterval as unknown as number };
    }

    if (useSound) {
        try {
            const rainSound = new Audio(config.sound);
            rainSound.loop = true;
            rainSound.volume = settings.store.rainVolume / 100;

            // Ensure the sound starts playing
            rainSound.play().catch(err => {
                console.error("Rain sound failed to play:", err);
            });

            currentRain = { ...currentRain, rainSound };
        } catch (err) {
            console.error("Error initializing rain sound:", err);
        }
    }

    console.log(`${preset} rain started with${useLightning && settings.store.enableThunder ? "" : "out"} thunder and${useSound ? "" : "out"} sound.`);
};

const StopRain = () => {
    if (currentRain) {
        if (currentRain.rainSound) {
            currentRain.rainSound.pause();
            currentRain.rainSound = undefined;
        }
        if (currentRain.lightningInterval) {
            clearInterval(currentRain.lightningInterval);
            currentRain.lightningInterval = undefined;
        }
        if (currentRain.lightningOverlay) {
            currentRain.lightningOverlay.remove();
            currentRain.lightningOverlay = undefined;
        }
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
    } else {
        console.warn("No active rain sound to update volume.");
    }
};

const updateRainEffect = () => {
    // Uniforms are updated in animation loop lol
};

const updateMistEffect = () => {
    mistLayers.forEach((layer, index) => {
        const baseAlpha = mistConfigs[index].alpha;
        layer.style.opacity = `${baseAlpha * settings.store.mistIntensity}`;
    });
};

const settings = definePluginSettings({
    dynamicWeather: {
        type: OptionType.BOOLEAN,
        description: "Enable dynamic weather simulation with realistic patterns",
        default: false,
        onChange: (value: boolean) => {
            if (value) {
                startDynamicWeather();
            } else {
                stopDynamicWeather();
            }
        },
    },
    preset: {
        type: OptionType.SELECT,
        description: "Choose a rain preset to quickly apply settings.",
        options: [
            { label: "Normal Rain", value: "Normal" },
            { label: "Slow n' Comfy", value: "Slow" },
            { label: "Heavy n' Relaxing", value: "Heavy" },
            { label: "Downpouring Sadness", value: "Downpour" }
        ],
        default: "Heavy",
        onChange: (preset: string) => {
            if (isPluginActive) {
                updatePresetSettings(preset);
                StartRain(preset);
            }
        },
    },
    enableThunder: {
        type: OptionType.BOOLEAN,
        description: "Enable or disable thunder.",
        default: true,
        onChange: (value: boolean) => {
            if (isPluginActive) {
                console.log(`Thunder has been ${value ? "enabled" : "disabled"}.`);
            }
        },
    },
    enableMist: {
        type: OptionType.BOOLEAN,
        description: "Enable or disable the mist effect.",
        default: true,
        onChange: (value: boolean) => {
            if (isPluginActive) {
                if (value) {
                    setupMistEffect();
                } else {
                    removeMist();
                }
            }
        },
    },
    mistIntensity: {
        type: OptionType.SLIDER,
        description: "Adjust mist density and visibility.",
        default: 0.7,
        markers: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1],
        onChange: () => {
            if (isPluginActive) updateMistEffect();
        },
    },
    rainVolume: {
        type: OptionType.SLIDER,
        description: "Adjust the rain sound volume (0 = mute, 100 = max).",
        default: defaultConfigs.Heavy.volume,
        markers: [0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 100],
        onChange: () => {
            if (isPluginActive) updateRainVolume();
        },
    },
    rainIntensity: {
        type: OptionType.SLIDER,
        description: "Rain effect intensity (0 = none, 1 = max).",
        default: defaultConfigs.Heavy.intensity,
        markers: [0, 0.07, 0.14, 0.21, 0.28, 0.35, 0.42, 0.49, 0.56, 0.63, 0.7, 0.77, 0.84, 0.91, 1],
        onChange: () => {
            if (isPluginActive) updateRainEffect();
        },
    },
    rainScale: {
        type: OptionType.SLIDER,
        description: "Raindrop size scale.",
        default: defaultConfigs.Heavy.scale,
        markers: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.0],
        onChange: () => {
            if (isPluginActive) updateRainEffect();
        },
    },
    rainAngle: {
        type: OptionType.SLIDER,
        description: "Adjust the angle of the rain (in degrees).",
        default: defaultConfigs.Heavy.angle,
        markers: [-45, -39, -33, -27, -21, -15, -9, -3, 3, 9, 15, 21, 27, 33, 45],
        onChange: () => {
            if (isPluginActive) updateRainEffect();
        },
    },
    rainSpeed: {
        type: OptionType.SLIDER,
        description: "Adjust the speed of the rain.",
        default: defaultConfigs.Heavy.speed,
        markers: [0.1, 0.24, 0.38, 0.52, 0.66, 0.8, 0.94, 1.08, 1.22, 1.36, 1.5, 1.64, 1.78, 1.92, 2.0],
        onChange: () => {
            if (isPluginActive) updateRainEffect();
        },
    },
    sound: {
        type: OptionType.STRING,
        description: "URL of the rain sound effect.",
        default: defaultConfigs.Heavy.sound,
    },
    showForestBackground: {
        type: OptionType.BOOLEAN,
        description: "Show the forest background.",
        default: true,
        onChange: (value: boolean) => {
            if (isPluginActive) {
                if (value) {
                    setForestBackground();
                } else {
                    removeForestBackground();
                }
            }
        },
    },
});

const handleResize = () => {
    if (rainCanvas) {
        rainCanvas.width = window.innerWidth;
        rainCanvas.height = window.innerHeight;

        if (gl && program) {
            const resolutionUniform = gl.getUniformLocation(program, "uResolution");
            if (resolutionUniform) {
                gl.uniform2f(resolutionUniform, rainCanvas.width, rainCanvas.height);
            }
        }
    }
    handleMistResize();
};

export default definePlugin({
    name: "Habitat Rain",
    description: "A cozy plugin that makes you feel at home in the rain.",
    authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
    version: "3.0.2",
    settings,
    start() {
        console.log("HabitatRain started!");
        isPluginActive = true;

        if (this.settings.store.showForestBackground) setForestBackground();
        StartRain(this.settings.store.preset || "Heavy", true, true);
        if (this.settings.store.enableMist) setupMistEffect();
        window.addEventListener("resize", handleResize);
    },
    stop() {
        console.log("HabitatRain stopped!");
        isPluginActive = false;
        StopRain();
        stopDynamicWeather(); // Add this line
        removeForestBackground();
        removeMist();
        window.removeEventListener("resize", handleResize);
    },
});
