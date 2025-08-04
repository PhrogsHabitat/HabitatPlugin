/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../utils/settingsStore";
import { forestBackground } from "./ForestBackground";
const MAX_RETRIES = 3;
let contextLostCount = 0;

let rainCanvas: HTMLCanvasElement | null = null;
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let texture: WebGLTexture | null = null;
let animationFrameId: number | null = null;
let startTime: number = 0;
let isContextLost = false;
let lastFrameTime = performance.now();
let isStaticTextureSet = false; // Track if static texture has been set

const defaultRainColor = [0.2, 0.3, 1.0]; // Bluish rain color

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
    uniform float uTime;
    uniform float uIntensity;
    uniform float uScale;
    uniform float uAngle;
    uniform float uSpeed;
    uniform vec2 uResolution;
    uniform vec3 uRainColor;

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

    float rand(vec2 a) {
        return fract(sin(dot(mod(a, vec2(1000.0)), vec2(12.9898, 78.233))) * 43758.5453);
    }

    float ease(float t) {
        return t * t * (3.0 - 2.0 * t);
    }

    float rainDist(vec2 p, float scale, float intensity) {
        float angleRad = radians(uAngle);
        mat2 rotation = mat2(cos(angleRad), -sin(angleRad), sin(angleRad), cos(angleRad));
        p = rotation * p;

        p *= 0.1;
        p.x += p.y * 0.1;
        p.y -= uTime * 500.0 * uSpeed / scale;
        p.y *= 0.03;
        float ix = floor(p.x);
        p.y += mod(ix, 2.0) * 0.5 + (rand(vec2(ix)) - 0.5) * 0.3;
        float iy = floor(p.y);
        vec2 index = vec2(ix, iy);
        p -= index;
        p.x += (rand(index.yx) * 2.0 - 1.0) * 0.35;
        vec2 a = abs(p - 0.5);
        float res = max(a.x * 0.8, a.y * 0.5) - 0.1;
        bool empty = rand(index) < mix(1.0, 0.1, intensity);
        return empty ? 1.0 : res;
    }

    void main() {
        vec2 wpos = vUv * uResolution;
        float intensity = uIntensity;

        vec3 add = vec3(0.0);
        float rainSum = 0.0;

        const int numLayers = 4;
        float scales[4];
        scales[0] = 1.0;
        scales[1] = 1.8;
        scales[2] = 4.6;
        scales[3] = 9.8;

        for (int i = 0; i < numLayers; i++) {
            float scale = scales[i];
            float r = rainDist(wpos * scale / uScale + 500.0 * float(i), scale, intensity);
            if (r < 0.0) {
                float v = (1.0 - exp(r * 5.0)) / scale * 2.0;
                // For background layers (higher scale), clamp v to a minimum for visibility
                if (i >= 2) {
                    v = max(v, 0.08); // Only for farthest two layers
                }
                wpos.x += v * 10.0 * uScale;
                wpos.y -= v * 2.0 * uScale;
                add += vec3(0.1, 0.15, 0.2) * v; // original color
                rainSum += (1.0 - rainSum) * 0.75; // original blend
            }
        }

        vec2 sampleUV = wpos / uResolution;
        vec3 color = texture2D(uTexture, sampleUV).rgb;

        color += add;
        color = mix(color, uRainColor, 0.1 * rainSum); // original blend

        gl_FragColor = vec4(color, 1.0);
    }
`;

export function setup() {
    cleanup();
    if (!isActive()) return;

    rainCanvas = document.createElement("canvas");
    rainCanvas.id = `habitat-rain-canvas-${Date.now()}`;
    rainCanvas.style.position = "fixed";
    rainCanvas.style.top = "0px";
    rainCanvas.style.left = "0";
    rainCanvas.style.width = "100%";
    rainCanvas.style.height = "100%";
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

        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Set initial texture based on background type
        if (forestBackground) {
            if (forestBackground instanceof HTMLImageElement) {
                // Static image - set texture immediately
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, forestBackground);
                isStaticTextureSet = true;
            } else {
                // Video - use placeholder until frames are available
                const placeholder = new Uint8Array([255, 0, 255, 255]);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);
                isStaticTextureSet = false;
            }
        } else {
            // No background - use placeholder
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

        const textureUniform = gl.getUniformLocation(program, "uTexture");
        const timeUniform = gl.getUniformLocation(program, "uTime");
        const intensityUniform = gl.getUniformLocation(program, "uIntensity");
        const scaleUniform = gl.getUniformLocation(program, "uScale");
        const angleUniform = gl.getUniformLocation(program, "uAngle");
        const speedUniform = gl.getUniformLocation(program, "uSpeed");
        const resolutionUniform = gl.getUniformLocation(program, "uResolution");
        const rainColorUniform = gl.getUniformLocation(program, "uRainColor");

        gl.uniform1i(textureUniform, 0);
        gl.uniform1f(intensityUniform, settings.store.rainIntensity);
        gl.uniform1f(scaleUniform, Number(settings.store.rainScale));
        gl.uniform1f(angleUniform, Number(settings.store.rainAngle));
        gl.uniform1f(speedUniform, Number(settings.store.rainSpeed));
        gl.uniform2f(resolutionUniform, rainCanvas.width, rainCanvas.height);
        gl.uniform3fv(rainColorUniform, defaultRainColor);

        startTime = performance.now();
        animationFrameId = requestAnimationFrame(animate);
        contextLostCount = 0;
    } catch (e) {
        console.error("WebGL initialization failed:", e);
        contextLostCount++;
        if (contextLostCount < MAX_RETRIES) setTimeout(setup, 1000);
    }
}

export function cleanup() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (rainCanvas?.parentNode) rainCanvas.parentNode.removeChild(rainCanvas);

    rainCanvas = null;
    program = null;
    texture = null;
    gl = null;
}

export function update() {
    // Uniforms are updated in animation loop
}

export function handleResize() {
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
}

function animate() {
    if (isContextLost) return;
    if (!gl || !program || !rainCanvas) return;

    try {
        // Update texture based on background type
        if (forestBackground) {
            if (forestBackground instanceof HTMLVideoElement) {
                // Video - update texture each frame if ready
                if (forestBackground.readyState >= HTMLMediaElement.HAVE_METADATA) {
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, forestBackground);
                }
            } else if (!isStaticTextureSet) {
                // Static image - only set once
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, forestBackground);
                isStaticTextureSet = true;
            }
        }

        // Update uniforms
        const textureUniform = gl.getUniformLocation(program, "uTexture");
        const timeUniform = gl.getUniformLocation(program, "uTime");
        const intensityUniform = gl.getUniformLocation(program, "uIntensity");
        const scaleUniform = gl.getUniformLocation(program, "uScale");
        const angleUniform = gl.getUniformLocation(program, "uAngle");
        const speedUniform = gl.getUniformLocation(program, "uSpeed");

        if (timeUniform) gl.uniform1f(timeUniform, (performance.now() - startTime) / 1000);
        if (intensityUniform) gl.uniform1f(intensityUniform, settings.store.rainIntensity);
        if (scaleUniform) gl.uniform1f(scaleUniform, Number(settings.store.rainScale));
        if (angleUniform) gl.uniform1f(angleUniform, Number(settings.store.rainAngle));
        if (speedUniform) gl.uniform1f(speedUniform, Number(settings.store.rainSpeed));

        // Render
        gl.viewport(0, 0, rainCanvas.width, rainCanvas.height);
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
    return settings.store.showForestBackground;
}

export function reset() {
    cleanup();
    if (isActive()) setup();
}
