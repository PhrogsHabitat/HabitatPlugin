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

const defaultRainColor = [0.4, 0.5, 0.8]; // Bluish rain color

const thunderPool = [
    "https://phrogshabitat.github.io/thunder1.mp3",
    "https://phrogshabitat.github.io/thunder2.mp3",
    "https://phrogshabitat.github.io/thunder3.mp3",
    "https://phrogshabitat.github.io/thunder4.mp3",
    "https://phrogshabitat.github.io/thunder5.mp3",
];

const defaultConfigs = {
    Normal: {
        volume: 70,
        intensity: 0.5,
        scale: 1.2,
        angle: -3,
        speed: 0.5,
        thunderRarity: 0.05, // Rare thunder
        sound: "https://phrogshabitat.github.io/RainSoft.mp3"
    },
    Slow: {
        volume: 56,
        intensity: 0.14,
        scale: 2.0,
        angle: 0,
        speed: 0.4,
        thunderRarity: 0.02, // Very rare thunder
        sound: "https://phrogshabitat.github.io/RainSoft.mp3"
    },
    Heavy: {
        volume: 56,
        intensity: 0.28,
        scale: 1.0,
        angle: 7.5,
        speed: 1.2,
        thunderRarity: 0.1, // Frequent thunder
        sound: "https://phrogshabitat.github.io/RainHeavy.mp3"
    },
    Downpour: {
        volume: 70,
        intensity: 0.91,
        scale: 1.4,
        angle: 15,
        speed: 1.7,
        thunderRarity: 0.15, // Very frequent thunder
        sound: "https://phrogshabitat.github.io/RainDownpour.mp3"
    },
};

let contextLostCount = 0;
const MAX_RETRIES = 3;

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
    // Uniforms are updated in animation loop
};

const settings = definePluginSettings({
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

        window.addEventListener("resize", handleResize);
    },
    stop() {
        console.log("HabitatRain stopped!");
        isPluginActive = false;
        StopRain();
        removeForestBackground();
        window.removeEventListener("resize", handleResize);
    },
});
