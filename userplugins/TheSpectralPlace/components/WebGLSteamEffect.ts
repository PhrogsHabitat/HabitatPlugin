/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// WebGLSteamEffect.ts - Fixed: Steam continues until sound ends
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../utils/settingsStore";

let steamCanvas: HTMLCanvasElement | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let animationFrameId: number | null = null;
let startTime: number = 0;
let isContextLost = false;

// Steam burst management
interface SteamBurst {
    active: boolean;
    side: "left" | "right"; // Which side the burst comes from
    startTime: number;
    soundStartTime: number; // When the sound actually started playing
    duration: number; // Duration in seconds
    intensity: number;
    progress: number; // 0 to 1
    soundUrl: string;
    audioElement: HTMLAudioElement | null;
}

let activeBursts: SteamBurst[] = [];
let lastBurstTime: number = 0;
const MIN_BURST_INTERVAL = 8000; // 8 seconds minimum between bursts
const MAX_BURST_INTERVAL = 25000; // 25 seconds maximum between bursts

// Steam sound effects - we'll use these from MechanicalEffect
const steamSounds = [
    "STEAM_RELEASE1",
    "STEAM_RELEASE2",
    "PISTON_HISS1",
    "PISTON_HISS2"
];

const vertexShaderSource = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uDensity;
    uniform float uTurbulence;
    uniform float uHeight;
    uniform float uDissipation;
    uniform vec2 uResolution;

    // Burst uniforms
    uniform float uBurst1Active;
    uniform float uBurst1Side;
    uniform float uBurst1Progress;
    uniform float uBurst1Intensity;

    uniform float uBurst2Active;
    uniform float uBurst2Side;
    uniform float uBurst2Progress;
    uniform float uBurst2Intensity;

    uniform float uBurst3Active;
    uniform float uBurst3Side;
    uniform float uBurst3Progress;
    uniform float uBurst3Intensity;

    // Hash function for noise generation
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // Smooth noise function
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Fractal Brownian Motion for organic smoke patterns
    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 8; i++) {
            value += amplitude * noise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
        }
        return value;
    }

    // 3D noise for volumetric effects
    float noise3D(vec3 p) {
        vec2 xy = p.xy;
        vec2 xz = p.xz;
        vec2 yz = p.yz;
        return (noise(xy) + noise(xz) + noise(yz)) / 3.0;
    }

    // Generate steam plume for a burst - INCREASED HEIGHT, MAINTAINED THINNESS
    float steamBurstPlume(vec2 uv, float time, float burstProgress, float burstIntensity, float side, float burstActive) {
        if (burstActive < 0.5) return 0.0;

        // Fixed source position based on side (0.0 = left, 1.0 = right)
        float baseX = mix(0.2, 0.8, side);

        // Distance from steam source center - source stays at bottom
        float distFromCenter = abs(uv.x - baseX);

        // The steam source is ALWAYS at the bottom (uv.y = 0)
        float distanceFromSource = 1.0 - uv.y; // 0 at bottom, 1 at top

        // INCREASED: Steam can travel much higher - from 1.2 to 3.5
        float maxTravelDistance = burstProgress * 3.5;

        // Only show steam that hasn't traveled beyond maxTravelDistance
        if (distanceFromSource > maxTravelDistance) {
            return 0.0;
        }

        // Calculate normalized position within the steam column (0 at source, 1 at leading edge)
        float verticalPosInPlume = distanceFromSource / maxTravelDistance;

        // Create flow position for noise sampling
        vec2 flowPos = vec2(uv.x, uv.y);

        // Add swirling motion - reduced frequency for taller plumes
        float swirl = sin(verticalPosInPlume * 6.0 + time * uSpeed * 1.2) * 0.12;
        flowPos.x += swirl;

        // Turbulence layers - adjusted for taller plumes
        float turbulence1 = fbm(flowPos * 2.5 + vec2(time * uSpeed * 0.6, 0.0)) * uTurbulence;
        float turbulence2 = fbm(flowPos * 5.0 - vec2(time * uSpeed * 0.4, 0.0)) * uTurbulence * 0.5;
        float turbulence3 = fbm(flowPos * 10.0 + vec2(time * uSpeed * 0.9, 0.0)) * uTurbulence * 0.25;
        flowPos.x += (turbulence1 + turbulence2 + turbulence3) * 0.15 * verticalPosInPlume;

        // Steam plume width - REDUCED expansion to maintain thinness despite increased height
        float baseWidth = 0.05; // Slightly narrower base
        // Adjusted expansion to increase with height
        float expansion = verticalPosInPlume * 0.3 * uHeight; // Increased expansion rate with height
        float width = baseWidth + expansion;

        // Base plume shape - Gaussian distribution centered at the source
        float plume = exp(-(distFromCenter * distFromCenter) / (width * width));

        // Intensity based on burst progress and vertical position
        // Adjusted dissipation and intensity falloff for longer visibility
        float sourceIntensity = 1.0 - smoothstep(0.0, 1.5, burstProgress); // Slower falloff
        sourceIntensity = sourceIntensity * sourceIntensity; // Quadratic falloff

        // Vertical intensity - adjusted for slower dissipation
        float verticalIntensity = 1.0 - smoothstep(0.0, 1.5, verticalPosInPlume); // Slower falloff
        verticalIntensity = verticalIntensity * verticalIntensity; // Quadratic falloff

        // Volumetric density with 3D noise - adjusted for taller plumes
        vec3 volumePos = vec3(flowPos.x * 8.0, distanceFromSource * 20.0, time * uSpeed + side * 10.0);
        float volumetricNoise = noise3D(volumePos) * 0.6;
        volumetricNoise += noise3D(volumePos * 1.8) * 0.3;
        volumetricNoise += noise3D(volumePos * 3.6) * 0.1;

        // Combine all factors
        plume *= sourceIntensity * verticalIntensity * burstIntensity;
        plume *= (0.5 + volumetricNoise * 0.5); // More variation for wispy look

        // Smooth fade at the leading edge of the steam - adjusted for taller plumes
        float edgeFade = 1.0 - smoothstep(0.6, 1.0, verticalPosInPlume); // Later fade start

        // Additional wispiness - make the steam more broken up and wispy at higher altitudes
        float wispiness = fbm(vec2(uv.x * 15.0, distanceFromSource * 25.0 + time * 0.5)) * 0.3 + 0.7;
        plume *= wispiness;

        plume *= edgeFade;

        return plume * uDensity;
    }

    // Steam color palette for bursts - adjusted for taller, wispier plumes
    vec3 steamColor(float density, vec2 uv, float time) {
        // Lighter, more transparent steam colors for wispier look
        vec3 lightSteam = vec3(1.0, 1.0, 1.0);           // Pure white
        vec3 mediumSteam = vec3(0.97, 0.97, 0.98);       // Very light gray
        vec3 warmSteam = vec3(1.0, 0.99, 0.95);          // Very subtle warm white

        // Base color based on density - more transparent overall
        vec3 baseColor;
        if (density > 0.4) {
            baseColor = mix(mediumSteam, lightSteam, (density - 0.4) * 1.67);
        } else {
            baseColor = mix(vec3(1.0), lightSteam, density * 2.5);
        }

        // Add subtle warm tones near the source (bottom)
        float warmth = (1.0 - uv.y) * 0.2; // Reduced warmth for more neutral look
        baseColor = mix(baseColor, warmSteam, warmth * density);

        return baseColor;
    }

    void main() {
        vec2 uv = vUv;
        float time = uTime;

        float totalSteam = 0.0;

        // Render each active burst
        totalSteam += steamBurstPlume(uv, time, uBurst1Progress, uBurst1Intensity, uBurst1Side, uBurst1Active);
        totalSteam += steamBurstPlume(uv, time, uBurst2Progress, uBurst2Intensity, uBurst2Side, uBurst2Active);
        totalSteam += steamBurstPlume(uv, time, uBurst3Progress, uBurst3Intensity, uBurst3Side, uBurst3Active);

        // Clamp density
        totalSteam = clamp(totalSteam, 0.0, 1.0);

        // Get steam color
        vec3 color = steamColor(totalSteam, uv, time);

        // Transparent background
        vec3 background = vec3(0.0, 0.0, 0.0);

        // Mix steam with background
        vec3 finalColor = mix(background, color, totalSteam);

        // Calculate alpha - more transparent for wispier look
        float alpha = totalSteam * 0.6; // Reduced from 0.8 for more transparency

        // Ensure colors stay in valid range
        finalColor = clamp(finalColor, 0.0, 1.0);
        alpha = clamp(alpha, 0.0, 1.0);

        gl_FragColor = vec4(finalColor, alpha);
    }
`;

export function setup() {
    cleanup();
    if (!isActive()) return;

    steamCanvas = document.createElement("canvas");
    steamCanvas.id = `steampunk-steam-effect-${Date.now()}`;
    steamCanvas.style.position = "fixed";
    steamCanvas.style.top = "0px";
    steamCanvas.style.left = "0";
    steamCanvas.style.width = "100%";
    steamCanvas.style.height = "100%";
    steamCanvas.style.zIndex = "9998";
    steamCanvas.style.pointerEvents = "none";
    steamCanvas.style.mixBlendMode = "screen";
    steamCanvas.width = window.innerWidth;
    steamCanvas.height = window.innerHeight;

    document.body.appendChild(steamCanvas);

    try {
        gl = steamCanvas.getContext("webgl", {
            preserveDrawingBuffer: false,
            antialias: false,
            alpha: true,
            premultipliedAlpha: false
        });

        if (!gl) {
            console.error("WebGL not supported for steam effect");
            return;
        }

        steamCanvas.addEventListener("webglcontextlost", handleContextLost, false);
        steamCanvas.addEventListener("webglcontextrestored", handleContextRestored, false);

        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            console.error("Failed to compile steam shaders");
            return;
        }

        program = gl.createProgram();
        if (!program) {
            console.error("Failed to create WebGL program for steam");
            return;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Steam shader program link error:", gl.getProgramInfoLog(program));
            return;
        }

        gl.useProgram(program);

        // Set up vertex buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);

        const positionAttribute = gl.getAttribLocation(program, "aPosition");
        gl.enableVertexAttribArray(positionAttribute);
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

        // Set up initial uniforms
        const resolutionUniform = gl.getUniformLocation(program, "uResolution");
        const speedUniform = gl.getUniformLocation(program, "uSpeed");
        const densityUniform = gl.getUniformLocation(program, "uDensity");
        const turbulenceUniform = gl.getUniformLocation(program, "uTurbulence");
        const heightUniform = gl.getUniformLocation(program, "uHeight");
        const dissipationUniform = gl.getUniformLocation(program, "uDissipation");

        if (resolutionUniform) gl.uniform2f(resolutionUniform, steamCanvas.width, steamCanvas.height);
        if (speedUniform) gl.uniform1f(speedUniform, getSteamSpeed());
        if (densityUniform) gl.uniform1f(densityUniform, getSteamDensity());
        if (turbulenceUniform) gl.uniform1f(turbulenceUniform, getSteamTurbulence());
        if (heightUniform) gl.uniform1f(heightUniform, getSteamHeight());
        if (dissipationUniform) gl.uniform1f(dissipationUniform, getSteamDissipation());

        // Initialize burst uniforms
        initializeBurstUniforms();

        startTime = performance.now();
        lastBurstTime = startTime;
        animationFrameId = requestAnimationFrame(animate);

        // Start the random burst scheduler
        scheduleRandomBurst();

    } catch (e) {
        console.error("WebGL steam effect initialization failed:", e);
    }
}

export function cleanup() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // Clean up any active audio elements
    activeBursts.forEach(burst => {
        if (burst.audioElement) {
            burst.audioElement.pause();
            burst.audioElement = null;
        }
    });

    if (steamCanvas?.parentNode) steamCanvas.parentNode.removeChild(steamCanvas);

    steamCanvas = null;
    program = null;
    gl = null;
    activeBursts = [];
}

export function update() {
    // Uniforms are updated in animation loop
}

export function handleResize() {
    if (steamCanvas) {
        steamCanvas.width = window.innerWidth;
        steamCanvas.height = window.innerHeight;
    }

    if (gl && program && steamCanvas) {
        const resolutionUniform = gl.getUniformLocation(program, "uResolution");
        if (resolutionUniform) {
            gl.uniform2f(resolutionUniform, steamCanvas.width, steamCanvas.height);
        }
    }
}

function animate() {
    if (isContextLost) return;
    if (!gl || !program || !steamCanvas) return;

    try {
        const currentTime = performance.now();

        // Update burst progress
        updateBursts(currentTime);

        // Update standard uniforms
        const timeUniform = gl.getUniformLocation(program, "uTime");
        const speedUniform = gl.getUniformLocation(program, "uSpeed");
        const densityUniform = gl.getUniformLocation(program, "uDensity");
        const turbulenceUniform = gl.getUniformLocation(program, "uTurbulence");
        const heightUniform = gl.getUniformLocation(program, "uHeight");
        const dissipationUniform = gl.getUniformLocation(program, "uDissipation");

        if (timeUniform) gl.uniform1f(timeUniform, (currentTime - startTime) / 1000);
        if (speedUniform) gl.uniform1f(speedUniform, getSteamSpeed());
        if (densityUniform) gl.uniform1f(densityUniform, getSteamDensity());
        if (turbulenceUniform) gl.uniform1f(turbulenceUniform, getSteamTurbulence());
        if (heightUniform) gl.uniform1f(heightUniform, getSteamHeight());
        if (dissipationUniform) gl.uniform1f(dissipationUniform, getSteamDissipation());

        // Update burst uniforms
        updateBurstUniforms();

        // Render
        gl.viewport(0, 0, steamCanvas.width, steamCanvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

    } catch (e) {
        console.error("Error in steam animation loop:", e);
        return;
    }
    animationFrameId = requestAnimationFrame(animate);
}

// Burst management functions
function initializeBurstUniforms() {
    if (!gl || !program) return;

    for (let i = 1; i <= 3; i++) {
        const activeUniform = gl.getUniformLocation(program, `uBurst${i}Active`);
        const sideUniform = gl.getUniformLocation(program, `uBurst${i}Side`);
        const progressUniform = gl.getUniformLocation(program, `uBurst${i}Progress`);
        const intensityUniform = gl.getUniformLocation(program, `uBurst${i}Intensity`);

        if (activeUniform) gl.uniform1f(activeUniform, 0.0);
        if (sideUniform) gl.uniform1f(sideUniform, 0.0);
        if (progressUniform) gl.uniform1f(progressUniform, 0.0);
        if (intensityUniform) gl.uniform1f(intensityUniform, 0.0);
    }
}

function updateBurstUniforms() {
    if (!gl || !program) return;

    for (let i = 0; i < 3; i++) {
        const burstIndex = i + 1;
        const burst = activeBursts[i];

        const activeUniform = gl.getUniformLocation(program, `uBurst${burstIndex}Active`);
        const sideUniform = gl.getUniformLocation(program, `uBurst${burstIndex}Side`);
        const progressUniform = gl.getUniformLocation(program, `uBurst${burstIndex}Progress`);
        const intensityUniform = gl.getUniformLocation(program, `uBurst${burstIndex}Intensity`);

        if (burst) {
            if (activeUniform) gl.uniform1f(activeUniform, burst.active ? 1.0 : 0.0);
            if (sideUniform) gl.uniform1f(sideUniform, burst.side === "left" ? 0.0 : 1.0);
            if (progressUniform) gl.uniform1f(progressUniform, burst.progress);
            if (intensityUniform) gl.uniform1f(intensityUniform, burst.intensity);
        } else {
            if (activeUniform) gl.uniform1f(activeUniform, 0.0);
            if (sideUniform) gl.uniform1f(sideUniform, 0.0);
            if (progressUniform) gl.uniform1f(progressUniform, 0.0);
            if (intensityUniform) gl.uniform1f(intensityUniform, 0.0);
        }
    }
}

function updateBursts(currentTime: number) {
    // Update progress for active bursts and remove finished ones
    activeBursts = activeBursts.filter(burst => {
        if (!burst.active) return false;

        // Calculate progress based on when the sound actually started
        const elapsed = (currentTime - burst.soundStartTime) / 1000;
        burst.progress = Math.min(elapsed / burst.duration, 1.0);

        // Deactivate burst when progress reaches 1 (sound has finished)
        if (burst.progress >= 1.0) {
            burst.active = false;
            if (burst.audioElement) {
                burst.audioElement = null; // Clean up audio reference
            }
            return false;
        }

        return true;
    });
}

function scheduleRandomBurst() {
    if (!isActive()) return;

    const now = performance.now();
    const timeSinceLastBurst = now - lastBurstTime;
    const minIntervalPassed = timeSinceLastBurst >= MIN_BURST_INTERVAL;

    if (minIntervalPassed) {
        const randomDelay = Math.random() * (MAX_BURST_INTERVAL - MIN_BURST_INTERVAL) + MIN_BURST_INTERVAL;

        setTimeout(() => {
            if (isActive()) {
                triggerRandomSteamBurst();
                scheduleRandomBurst(); // Schedule next burst
            }
        }, randomDelay);
    } else {
        // Wait until minimum interval has passed, then schedule
        const waitTime = MIN_BURST_INTERVAL - timeSinceLastBurst;
        setTimeout(() => scheduleRandomBurst(), waitTime);
    }
}

export function triggerRandomSteamBurst() {
    if (activeBursts.length >= 3) return; // Maximum 3 simultaneous bursts

    const now = performance.now();
    lastBurstTime = now;

    // Random side (left or right)
    const side = Math.random() > 0.5 ? "right" : "left";

    // Random steam sound
    const soundIndex = Math.floor(Math.random() * steamSounds.length);
    const soundType = steamSounds[soundIndex];

    // Create the burst first with initial values
    const burst: SteamBurst = {
        active: true,
        side,
        startTime: now,
        soundStartTime: now, // Will be updated when sound actually plays
        duration: 3.0, // Default duration, will be updated with actual sound duration
        intensity: 0.8 + Math.random() * 0.4,
        progress: 0.0,
        soundUrl: soundType,
        audioElement: null
    };

    activeBursts.push(burst);

    // Play the steam sound effect and get its actual duration
    playSteamSound(burst);

    console.log(`💨 Steam burst triggered: ${side} side, ${soundType}`);
}

function playSteamSound(burst: SteamBurst) {
    // Import the ASSETS and play the corresponding sound
    import("../utils/Constants.js").then(ConstantsModule => {
        const { ASSETS } = ConstantsModule;
        const soundUrl = ASSETS[burst.soundUrl as keyof typeof ASSETS];

        if (soundUrl) {
            const audio = new Audio(soundUrl);
            burst.audioElement = audio;

            // Set volume
            audio.volume = (settings.store.mechanicalVolume / 100) * 0.7;

            // Try to play the sound
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Sound started playing successfully
                    burst.soundStartTime = performance.now();

                    // Get the actual duration of the sound
                    if (audio.duration && isFinite(audio.duration)) {
                        burst.duration = audio.duration;
                        console.log(`🎵 Sound duration: ${burst.duration.toFixed(2)}s`);
                    }
                }).catch(e => {
                    console.warn("Could not play steam sound:", e);
                    // If sound fails to play, still keep the steam for default duration
                    burst.soundStartTime = performance.now();
                });
            }
        } else {
            // No sound URL, use default duration
            burst.soundStartTime = performance.now();
        }
    }).catch(e => {
        console.error("Failed to load Constants for steam sound:", e);
        // Fallback: use default duration
        burst.soundStartTime = performance.now();
    });
}

function handleContextLost(event: Event) {
    event.preventDefault();
    isContextLost = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    setTimeout(() => isActive() && setup(), 1000);
}

function handleContextRestored() {
    isContextLost = false;
    setup();
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Steam shader compile error: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function isActive() {
    return settings.store.enableSteam;
}

function getSteamSpeed() {
    return settings.store.steamSpeed || 1.0;
}

function getSteamDensity() {
    return settings.store.steamIntensity || 1.0;
}

function getSteamTurbulence() {
    return settings.store.steamTurbulence || 1.0;
}

function getSteamHeight() {
    return settings.store.steamHeight || 1.0;
}

function getSteamDissipation() {
    return settings.store.steamDissipation || 1.0;
}

// Manual trigger function for testing
export function triggerSteamBurst() {
    triggerRandomSteamBurst();
}
