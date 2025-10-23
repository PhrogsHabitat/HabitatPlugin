/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LightmapConfig, LightmapReader } from "./LightmapReader";

/**
 * Lighting System Component
 * Recreates the lighting system from the reference game
 * Based on RuntimeRainShader.hx and rain.frag
 */

// Light structure matching the reference implementation
export interface Light {
    position: [number, number]; // vec2 position in world coordinates
    color: [number, number, number]; // vec3 color (RGB values 0-1)
    radius: number; // float radius for light attenuation
}

export class LightingSystem {
    private static readonly MAX_LIGHTS = 200;
    private lights: Light[] = [];
    private numLights = 0;


    constructor() {
        this.lights = [];
        this.numLights = 0;
    }

    /**
     * Add a light to the system
     * @param light Light object to add
     * @returns true if light was added, false if max lights reached
     */
    addLight(light: Light): boolean {
        if (this.numLights >= LightingSystem.MAX_LIGHTS) {
            console.warn(`Cannot add light: maximum of ${LightingSystem.MAX_LIGHTS} lights supported`);
            return false;
        }

        this.lights.push(light);
        this.numLights++;
        return true;
    }

    /**
     * Remove a light by index
     * @param index Index of light to remove
     * @returns true if light was removed, false if index invalid
     */
    removeLight(index: number): boolean {
        if (index < 0 || index >= this.numLights) {
            return false;
        }

        this.lights.splice(index, 1);
        this.numLights--;
        return true;
    }

    /**
     * Clear all lights
     */
    clearLights(): void {
        this.lights = [];
        this.numLights = 0;
    }

    /**
     * Update a light's properties
     * @param index Index of light to update
     * @param light New light properties
     * @returns true if light was updated, false if index invalid
     */
    updateLight(index: number, light: Light): boolean {
        if (index < 0 || index >= this.numLights) {
            return false;
        }

        this.lights[index] = light;
        return true;
    }

    /**
     * Get all lights
     * @returns Array of current lights
     */
    getLights(): Light[] {
        return [...this.lights];
    }

    /**
     * Get number of active lights
     * @returns Number of lights currently in the system
     */
    getNumLights(): number {
        return this.numLights;
    }

    /**
     * Get maximum number of lights supported
     * @returns Maximum light count
     */
    static getMaxLights(): number {
        return LightingSystem.MAX_LIGHTS;
    }

    /**
     * Calculate light illumination at a given world position
     * This recreates the lightUp() function from the reference shader
     * @param worldPos World position [x, y]
     * @returns RGB color contribution from all lights
     */
    lightUp(worldPos: [number, number]): [number, number, number] {
        const result: [number, number, number] = [0, 0, 0];

        for (let i = 0; i < this.numLights; i++) {
            const light = this.lights[i];
            const lightPos = light.position;
            const lightColor = light.color;
            const lightRadius = light.radius;

            // Calculate distance from light to world position
            const dx = lightPos[0] - worldPos[0];
            const dy = lightPos[1] - worldPos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Calculate attenuation (matches shader: max(0.0, 1.0 - distance / radius))
            const attenuation = Math.max(0.0, 1.0 - distance / lightRadius);

            // Apply ease function (matches shader: t * t * (3.0 - 2.0 * t))
            const easedAttenuation = attenuation * attenuation * (3.0 - 2.0 * attenuation);

            // Add light contribution
            result[0] += easedAttenuation * lightColor[0];
            result[1] += easedAttenuation * lightColor[1];
            result[2] += easedAttenuation * lightColor[2];
        }

        return result;
    }

    /**
     * Update WebGL uniforms for the lighting system
     * @param gl WebGL rendering context
     * @param program WebGL program
     */
    updateUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
        // Update number of lights
        const numLightsUniform = gl.getUniformLocation(program, "uNumLights");
        if (numLightsUniform) {
            gl.uniform1i(numLightsUniform, this.numLights);
        }

        // Update light arrays
        for (let i = 0; i < LightingSystem.MAX_LIGHTS; i++) {
            const posUniform = gl.getUniformLocation(program, `uLightPositions[${i}]`);
            const colorUniform = gl.getUniformLocation(program, `uLightColors[${i}]`);
            const radiusUniform = gl.getUniformLocation(program, `uLightRadii[${i}]`);

            if (i < this.numLights) {
                const light = this.lights[i];
                if (posUniform) gl.uniform2fv(posUniform, light.position);
                if (colorUniform) gl.uniform3fv(colorUniform, light.color);
                if (radiusUniform) gl.uniform1f(radiusUniform, light.radius);
            } else {
                // Set unused lights to zero
                if (posUniform) gl.uniform2fv(posUniform, [0, 0]);
                if (colorUniform) gl.uniform3fv(colorUniform, [0, 0, 0]);
                if (radiusUniform) gl.uniform1f(radiusUniform, 0);
            }
        }


    }

    /**
     * Create a test light in the center of the screen
     * @param screenWidth Screen width in pixels
     * @param screenHeight Screen height in pixels
     * @returns The created test light
     */
    createCenterTestLight(screenWidth: number, screenHeight: number): Light {
        const testLight: Light = {
            position: [screenWidth / 2, screenHeight / 2],
            color: [1.0, 0.8, 0.6], // Warm white/orange light
            radius: 300 // 300 pixel radius
        };

        this.addLight(testLight);
        console.log("Added test light at center:", testLight);
        return testLight;
    }

    /**
     * Create a light with specific color and size
     * @param x X position in pixels
     * @param y Y position in pixels
     * @param color RGB color values (0-1 range)
     * @param radius Light radius in pixels
     * @returns The created light
     */
    createLight(x: number, y: number, color: [number, number, number], radius: number): Light {
        const light: Light = {
            position: [x, y],
            color: color,
            radius: radius
        };

        this.addLight(light);
        return light;
    }

    /**
     * Update light color by index
     * @param index Light index (0-based)
     * @param color New RGB color values (0-1 range)
     * @returns True if successful, false if index invalid
     */
    updateLightColor(index: number, color: [number, number, number]): boolean {
        if (index < 0 || index >= this.numLights) return false;

        this.lights[index].color = color;
        return true;
    }

    /**
     * Update light radius/size by index
     * @param index Light index (0-based)
     * @param radius New radius in pixels
     * @returns True if successful, false if index invalid
     */
    updateLightRadius(index: number, radius: number): boolean {
        if (index < 0 || index >= this.numLights) return false;

        this.lights[index].radius = radius;
        return true;
    }

    /**
     * Update light position by index
     * @param index Light index (0-based)
     * @param x New X position in pixels
     * @param y New Y position in pixels
     * @returns True if successful, false if index invalid
     */
    updateLightPosition(index: number, x: number, y: number): boolean {
        if (index < 0 || index >= this.numLights) return false;

        this.lights[index].position = [x, y];
        return true;
    }

    /**
     * Get light by index
     * @param index Light index (0-based)
     * @returns Light object or undefined if index invalid
     */
    getLight(index: number): Light | undefined {
        if (index < 0 || index >= this.numLights) return undefined;
        return this.lights[index];
    }

    /**
     * Preset light colors for easy use
     * Example: LightingSystem.COLORS.WARM_WHITE
     */
    static readonly COLORS = {
        WARM_WHITE: [1.0, 0.9, 0.7] as [number, number, number],
        COOL_WHITE: [0.8, 0.9, 1.0] as [number, number, number],
        ORANGE: [1.0, 0.6, 0.2] as [number, number, number],
        YELLOW: [1.0, 1.0, 0.3] as [number, number, number],
        RED: [1.0, 0.3, 0.3] as [number, number, number],
        GREEN: [0.3, 1.0, 0.3] as [number, number, number],
        BLUE: [0.3, 0.3, 1.0] as [number, number, number],
        PURPLE: [0.8, 0.3, 1.0] as [number, number, number],
        CYAN: [0.3, 1.0, 1.0] as [number, number, number],
        PINK: [1.0, 0.5, 0.8] as [number, number, number]
    };

    /**
     * Preset light sizes for easy use
     * Example: LightingSystem.SIZES.MEDIUM
     */
    static readonly SIZES = {
        SMALL: 150,
        MEDIUM: 300,
        LARGE: 500,
        HUGE: 800
    };

    /**
     * Load lights from a PNG lightmap image
     * @param lightmapUrl URL or path to the lightmap PNG
     * @param config Optional configuration for light detection
     * @param targetWidth Target canvas width for scaling (optional)
     * @param targetHeight Target canvas height for scaling (optional)
     * @returns Promise that resolves when lights are loaded
     */
    async loadFromLightmap(
        lightmapUrl: string,
        config?: Partial<LightmapConfig>,
        targetWidth?: number,
        targetHeight?: number
    ): Promise<void> {
        try {
            console.log(`🔄 Loading lights from lightmap: ${lightmapUrl}`);
            if (targetWidth && targetHeight) {
                console.log(`🎯 Target canvas size: ${targetWidth}x${targetHeight}`);
            }

            // Extract lights from the PNG with scaling
            const extractedLights = await LightmapReader.extractLightsFromPNG(lightmapUrl, config, targetWidth, targetHeight);

            // Clear existing lights and add the extracted ones
            this.clearLights();

            for (const light of extractedLights) {
                this.addLight(light);
                console.log(`➕ Added light at (${light.position[0].toFixed(1)}, ${light.position[1].toFixed(1)}) color(${light.color.map(c => c.toFixed(2)).join(",")}) radius=${light.radius.toFixed(1)}`);
            }

            console.log(`✅ Successfully loaded ${extractedLights.length} lights from lightmap`);

        } catch (error) {
            console.error("❌ Failed to load lightmap:", error);
            throw error;
        }
    }

    /**
     * Load lights from lightmap with custom detection settings
     * @param lightmapUrl URL or path to the lightmap PNG
     * @param brightnessThreshold Minimum brightness to detect lights (0-255)
     * @param minRadius Minimum light radius
     * @param maxRadius Maximum light radius
     * @returns Promise that resolves when lights are loaded
     */
    async loadFromLightmapCustom(
        lightmapUrl: string,
        brightnessThreshold: number = 30,
        minRadius: number = 100,
        maxRadius: number = 600
    ): Promise<void> {
        const config: Partial<LightmapConfig> = {
            brightnessThreshold,
            minRadius,
            maxRadius
        };

        return this.loadFromLightmap(lightmapUrl, config);
    }


}

// Global lighting system instance
export const lightingSystem = new LightingSystem();
