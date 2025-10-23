/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ASSETS } from "../utils/Constants";
import { settings } from "../utils/settingsStore";
import { lightingSystem } from "./LightingSystem";
import { steampunkBackground } from "./SteampunkBackground";

const MAX_RETRIES = 3;
let contextLostCount = 0;

let steampunkCanvas: HTMLCanvasElement | null = null;

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let texture: WebGLTexture | null = null;
let gearMapTexture: WebGLTexture | null = null;
let lightMapTexture: WebGLTexture | null = null;
let steamMapTexture: WebGLTexture | null = null;
let animationFrameId: number | null = null;
let startTime: number = 0;
let isContextLost = false;
let lastFrameTime = performance.now();
let isStaticTextureSet = false;

const defaultBrassColor = [0.7, 0.5, 0.2]; // Warm brass color

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
    uniform sampler2D uTexture;
    uniform sampler2D uGearMap;
    uniform sampler2D uLightMap;
    uniform sampler2D uSteamMap;
    uniform float uTime;
    uniform float uGearDensity;
    uniform float uGearScale;
    uniform float uPistonSpeed;
    uniform float uBrassTarnish;
    uniform vec2 uResolution;
    uniform vec3 uBrassColor;
    uniform int uNumLights;

    struct Light {
        vec2 position;
        vec3 color;
        float radius;
    };

    const int MAX_LIGHTS = 8;
    uniform vec2 uLightPositions[MAX_LIGHTS];
    uniform vec3 uLightColors[MAX_LIGHTS];
    uniform float uLightRadii[MAX_LIGHTS];

    // Noise functions for procedural effects
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

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

    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

    // Gear drawing function
    float drawGear(vec2 uv, vec2 center, float teeth, float innerRadius, float outerRadius, float rotation) {
        vec2 pos = uv - center;
        float angle = atan(pos.y, pos.x) + rotation;
        float dist = length(pos);

        // Basic gear shape
        float gear = smoothstep(innerRadius - 0.01, innerRadius, dist) -
                     smoothstep(outerRadius, outerRadius + 0.01, dist);

        // Add teeth
        float toothAngle = 6.28318 / teeth;
        float tooth = abs(mod(angle, toothAngle) - toothAngle * 0.5) / (toothAngle * 0.5);
        float toothProfile = smoothstep(0.3, 0.7, tooth) * 0.15;

        return gear + toothProfile * smoothstep(outerRadius - 0.02, outerRadius, dist);
    }

    // Steam effect
    float steamEffect(vec2 uv, float time) {
        vec2 steamUV = uv * 2.0;
        steamUV.y -= time * 0.1;

        float steam = fbm(steamUV + time * 0.3);
        steam = smoothstep(0.3, 0.8, steam * 1.5);
        steam *= (1.0 - uv.y); // Fade out toward top
        return steam;
    }

    // Brass color with tarnish
    vec3 getBrassColor(float tarnish) {
        vec3 baseBrass = vec3(0.7, 0.5, 0.2);
        vec3 tarnishColor = vec3(0.3, 0.4, 0.3);
        return mix(baseBrass, tarnishColor, tarnish);
    }

    // Dynamic lighting
    vec3 steampunkLightUp(vec2 worldPos) {
        vec3 result = vec3(0.0);
        for (int i = 0; i < MAX_LIGHTS; i++) {
            if (i >= uNumLights) break;

            vec2 lightPos = uLightPositions[i];
            vec3 lightColor = uLightColors[i];
            float lightRadius = uLightRadii[i];

            float distance = length(lightPos - worldPos);
            float attenuation = max(0.0, 1.0 - distance / lightRadius);
            float eased = attenuation * attenuation * (3.0 - 2.0 * attenuation);

            // Warm up the light colors for steampunk
            lightColor = mix(lightColor, lightColor * vec3(1.2, 0.9, 0.6), 0.3);
            result += eased * lightColor;
        }
        return result;
    }

    void main() {
        vec2 uv = vUv;
        vec2 worldPos = uv * uResolution;

        // Sample background
        vec3 background = texture2D(uTexture, uv).rgb;

        // Sample maps
        vec4 gearMap = texture2D(uGearMap, uv);
        vec4 lightMap = texture2D(uLightMap, uv);
        vec4 steamMap = texture2D(uSteamMap, uv);

        // Get gear mask and steam mask
        float gearMask = gearMap.r;
        float steamMask = steamMap.r;

        vec3 finalColor = background;
        vec3 mechanicalColor = vec3(0.0);

        // Only add mechanical elements where gear mask allows
        if (gearMask > 0.1 && uGearDensity > 0.01) {
            // Generate procedural gears
            float mechanicalLayer = 0.0;

            // Create multiple gear layers with different scales and rotations
            for (int i = 0; i < 5; i++) {
                float fi = float(i);
                vec2 gearPos = vec2(0.2 + mod(fi * 0.3, 0.8), 0.2 + mod(fi * 0.25, 0.7));
                float rotation = uTime * (0.5 + fi * 0.2) * uPistonSpeed;
                float gearSize = 0.05 + fi * 0.02;
                float gear = drawGear(uv, gearPos, 8.0 + fi * 4.0, gearSize * 0.5, gearSize, rotation);
                mechanicalLayer = max(mechanicalLayer, gear);
            }

            // Apply brass color with tarnish
            vec3 brass = getBrassColor(uBrassTarnish);
            mechanicalColor = brass * mechanicalLayer * uGearDensity;
        }

        // Add steam effects where steam mask allows
        float steam = 0.0;
        if (steamMask > 0.1) {
            steam = steamEffect(uv, uTime) * steamMask;
            // Steam color with slight blue tint
            vec3 steamColor = vec3(0.9, 0.95, 1.0);
            finalColor = mix(finalColor, steamColor, steam * 0.4);
        }

        // Apply dynamic lighting
        vec3 dynamicLight = steampunkLightUp(worldPos);

        // Combine everything with lighting
        finalColor = finalColor * (0.4 + dynamicLight * 0.6);
        finalColor += mechanicalColor * dynamicLight;

        // Add subtle glow to mechanical parts
        finalColor += mechanicalColor * 0.3;

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// Helper function to load texture
function loadTexture(url: string): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
        if (!gl) {
            reject(new Error("WebGL context not available"));
            return;
        }

        const texture = gl.createTexture();
        if (!texture) {
            reject(new Error("Failed to create texture"));
            return;
        }

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            gl!.bindTexture(gl!.TEXTURE_2D, texture);
            gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, image);
            gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
            gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
            gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
            gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
            resolve(texture);
        };
        image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        image.src = url;
    });
}

export async function setup() {
    cleanup();
    if (!isActive()) return;

    steampunkCanvas = document.createElement("canvas");
    steampunkCanvas.id = `steampunk-effect-canvas-${Date.now()}`;
    steampunkCanvas.style.position = "fixed";
    steampunkCanvas.style.top = "0px";
    steampunkCanvas.style.left = "0";
    steampunkCanvas.style.width = "100%";
    steampunkCanvas.style.height = "100%";
    steampunkCanvas.style.zIndex = "-1";
    steampunkCanvas.width = window.innerWidth;
    steampunkCanvas.height = window.innerHeight;

    document.body.appendChild(steampunkCanvas);

    try {
        gl = steampunkCanvas.getContext("webgl", {
            preserveDrawingBuffer: false,
            antialias: false,
            failIfMajorPerformanceCaveat: false
        });

        if (!gl) {
            console.error("WebGL not supported");
            return;
        }

        steampunkCanvas.addEventListener("webglcontextlost", handleContextLost, false);
        steampunkCanvas.addEventListener("webglcontextrestored", handleContextRestored, false);

        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            console.error("Failed to compile shaders");
            return;
        }

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

        try {
            gearMapTexture = await loadTexture(ASSETS.GEAR_MAP);
            lightMapTexture = await loadTexture(ASSETS.LIGHT_MAP);
            steamMapTexture = await loadTexture(ASSETS.STEAM_MAP);
            lightingSystem.clearLights();

            try {
                await lightingSystem.loadFromLightmap(ASSETS.LIGHT_MAP, {
                    brightnessThreshold: 25,
                    minRadius: 80,
                    maxRadius: 400,
                    radiusScale: 1.8,
                    minDistance: 40
                }, steampunkCanvas.width, steampunkCanvas.height);

            } catch (lightmapError) {
                console.warn("Failed to load lights from lightmap, using fallback:", lightmapError);
                // Fallback to manual test light
                lightingSystem.createLight(
                    steampunkCanvas.width / 2,
                    steampunkCanvas.height / 2,
                    [1.0, 0.8, 0.6],
                    300
                );
            }
        } catch (e) {
            console.error("Failed to load mapping textures:", e);
            // Create fallback textures if assets fail to load
            gearMapTexture = createFallbackGearMap();
            steamMapTexture = createFallbackSteamMap();
        }

        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Set initial texture based on background type
        if (steampunkBackground) {
            if (steampunkBackground instanceof HTMLImageElement) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, steampunkBackground);
                isStaticTextureSet = true;
            } else {
                const placeholder = new Uint8Array([255, 0, 255, 255]);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);
                isStaticTextureSet = false;
            }
        } else {
            const placeholder = new Uint8Array([255, 0, 255, 255]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);
            isStaticTextureSet = false;
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]), gl.STATIC_DRAW);

        const positionAttribute = gl.getAttribLocation(program, "aPosition");
        gl.enableVertexAttribArray(positionAttribute);
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

        // Set up uniforms
        const textureUniform = gl.getUniformLocation(program, "uTexture");
        const gearMapUniform = gl.getUniformLocation(program, "uGearMap");
        const lightMapUniform = gl.getUniformLocation(program, "uLightMap");
        const steamMapUniform = gl.getUniformLocation(program, "uSteamMap");
        const timeUniform = gl.getUniformLocation(program, "uTime");
        const gearDensityUniform = gl.getUniformLocation(program, "uGearDensity");
        const gearScaleUniform = gl.getUniformLocation(program, "uGearScale");
        const pistonSpeedUniform = gl.getUniformLocation(program, "uPistonSpeed");
        const brassTarnishUniform = gl.getUniformLocation(program, "uBrassTarnish");
        const resolutionUniform = gl.getUniformLocation(program, "uResolution");
        const brassColorUniform = gl.getUniformLocation(program, "uBrassColor");

        gl.uniform1i(textureUniform, 0);
        gl.uniform1i(gearMapUniform, 1);
        gl.uniform1i(lightMapUniform, 2);
        gl.uniform1i(steamMapUniform, 3);
        gl.uniform1f(gearDensityUniform, settings.store.gearDensity);
        gl.uniform1f(gearScaleUniform, Number(settings.store.gearScale));
        gl.uniform1f(pistonSpeedUniform, Number(settings.store.pistonSpeed));
        gl.uniform1f(brassTarnishUniform, Number(settings.store.brassTarnish));
        gl.uniform2f(resolutionUniform, steampunkCanvas.width, steampunkCanvas.height);
        gl.uniform3fv(brassColorUniform, defaultBrassColor);

        // Initialize light uniforms using the lighting system
        lightingSystem.updateUniforms(gl, program);

        startTime = performance.now();
        animationFrameId = requestAnimationFrame(animate);
        contextLostCount = 0;
    } catch (e) {
        console.error("WebGL initialization failed:", e);
        contextLostCount++;
        if (contextLostCount < MAX_RETRIES) setTimeout(setup, 1000);
    }
}

function createFallbackGearMap(): WebGLTexture {
    if (!gl) throw new Error("WebGL context not available");

    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create texture");

    // Create a simple fallback gear map with some mechanical areas
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (ctx) {
        // Clear to black
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 512, 512);

        // Draw some mechanical areas in white
        ctx.fillStyle = "white";

        // Bottom-left workshop area
        ctx.beginPath();
        ctx.ellipse(128, 400, 80, 60, 0, 0, Math.PI * 2);
        ctx.fill();

        // Center machinery
        ctx.beginPath();
        ctx.ellipse(256, 256, 100, 80, 0, 0, Math.PI * 2);
        ctx.fill();

        // Top-right mechanical area
        ctx.beginPath();
        ctx.ellipse(400, 150, 70, 50, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

function createFallbackSteamMap(): WebGLTexture {
    if (!gl) throw new Error("WebGL context not available");

    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create texture");

    // Create a simple fallback steam map
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (ctx) {
        // Clear to black
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 512, 512);

        // Draw steam sources in white (bottom areas)
        ctx.fillStyle = "white";

        // Steam from pipes
        ctx.beginPath();
        ctx.ellipse(150, 450, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(350, 470, 25, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(400, 430, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

export function cleanup() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (steampunkCanvas?.parentNode) steampunkCanvas.parentNode.removeChild(steampunkCanvas);

    steampunkCanvas = null;
    program = null;
    texture = null;
    gearMapTexture = null;
    lightMapTexture = null;
    steamMapTexture = null;
    gl = null;
}

export function update() {
    // Uniforms are updated in animation loop
}

export function handleResize() {
    if (steampunkCanvas) {
        steampunkCanvas.width = window.innerWidth;
        steampunkCanvas.height = window.innerHeight;
    }

    if (gl && program && steampunkCanvas) {
        const resolutionUniform = gl.getUniformLocation(program, "uResolution");
        if (resolutionUniform) {
            gl.uniform2f(resolutionUniform, steampunkCanvas.width, steampunkCanvas.height);
        }
    }
}

function animate() {
    if (isContextLost) return;
    if (!gl || !program || !steampunkCanvas) return;

    try {
        // Update texture based on background type
        if (steampunkBackground) {
            if (steampunkBackground instanceof HTMLVideoElement) {
                if (steampunkBackground.readyState >= HTMLMediaElement.HAVE_METADATA) {
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, steampunkBackground);
                }
            } else if (!isStaticTextureSet) {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, steampunkBackground);
                isStaticTextureSet = true;
            }
        }

        // Activate texture units
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, gearMapTexture);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, lightMapTexture);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, steamMapTexture);

        // Update uniforms
        const timeUniform = gl.getUniformLocation(program, "uTime");
        const gearDensityUniform = gl.getUniformLocation(program, "uGearDensity");
        const gearScaleUniform = gl.getUniformLocation(program, "uGearScale");
        const pistonSpeedUniform = gl.getUniformLocation(program, "uPistonSpeed");
        const brassTarnishUniform = gl.getUniformLocation(program, "uBrassTarnish");

        if (timeUniform) gl.uniform1f(timeUniform, (performance.now() - startTime) / 1000);
        if (gearDensityUniform) gl.uniform1f(gearDensityUniform, settings.store.gearDensity);
        if (gearScaleUniform) gl.uniform1f(gearScaleUniform, Number(settings.store.gearScale));
        if (pistonSpeedUniform) gl.uniform1f(pistonSpeedUniform, Number(settings.store.pistonSpeed));
        if (brassTarnishUniform) gl.uniform1f(brassTarnishUniform, Number(settings.store.brassTarnish));

        // Update light uniforms using the lighting system
        lightingSystem.updateUniforms(gl, program);

        // Render
        gl.viewport(0, 0, steampunkCanvas.width, steampunkCanvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        const now = performance.now();
        const deltaTime = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

    } catch (e) {
        console.error("Error in animation loop:", e);
        return;
    }
    animationFrameId = requestAnimationFrame(animate);
}

function handleContextLost(event: Event) {
    event.preventDefault();
    isContextLost = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    setTimeout(() => isActive() && setup(), 2000 + contextLostCount * 1000);
}

function handleContextRestored() {
    isContextLost = false;
    contextLostCount = 0;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
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
}

function isActive() {
    return settings.store.showSteampunkBackground;
}

export function reset() {
    cleanup();
    if (isActive()) setup();
}
