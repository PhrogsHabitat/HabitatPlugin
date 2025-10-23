/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Light } from "./LightingSystem";

export interface LightmapConfig {
    /** Minimum brightness threshold to detect a light (0-255) */
    brightnessThreshold: number;
    /** Minimum radius for detected lights */
    minRadius: number;
    /** Maximum radius for detected lights */
    maxRadius: number;
    /** Scale factor for converting brightness to radius */
    radiusScale: number;
    /** Minimum distance between light centers to avoid duplicates */
    minDistance: number;
}

export interface DetectedLight {
    x: number;
    y: number;
    color: [number, number, number];
    radius: number;
    brightness: number;
}

export class LightmapReader {
    private static readonly DEFAULT_CONFIG: LightmapConfig = {
        brightnessThreshold: 30,
        minRadius: 100,
        maxRadius: 600,
        radiusScale: 2.0,
        minDistance: 50
    };

    /**
     * Extract lights from a PNG lightmap image
     * @param imageUrl URL or path to the lightmap PNG
     * @param config Configuration for light detection
     * @returns Promise resolving to array of detected lights
     */
    static async extractLightsFromPNG(
        imageUrl: string,
        config: Partial<LightmapConfig> = {},
        targetWidth?: number,
        targetHeight?: number
    ): Promise<Light[]> {
        const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

        try {
            // Load the image
            const image = await this.loadImage(imageUrl);

            // Create canvas to read pixel data
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Failed to get 2D context");
            }

            canvas.width = image.width;
            canvas.height = image.height;

            // Draw image to canvas
            ctx.drawImage(image, 0, 0);

            // Get pixel data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            // Detect light areas
            const detectedLights = this.detectLightAreas(pixels, canvas.width, canvas.height, finalConfig);

            // Calculate scaling factors if target dimensions are provided
            const scaleX = targetWidth ? targetWidth / canvas.width : 1;
            const scaleY = targetHeight ? targetHeight / canvas.height : 1;

            // DEBUG: Log all detected lights before filtering
            console.log(`🔍 DETECTION DEBUG: Found ${detectedLights.length} potential lights:`);
            detectedLights.forEach((light, i) => {
                console.log(`  Potential ${i}: pos(${light.x}, ${light.y}) brightness=${light.brightness} color(${light.color.map(c => c.toFixed(2)).join(",")}) radius=${light.radius.toFixed(1)}`);
            });

            // Convert to Light objects with scaling and filter out edge artifacts
            const lights: Light[] = detectedLights
                .filter(detected => {
                    // Filter out lights too close to edges (likely artifacts)
                    const edgeMargin = 10; // Reduced margin to allow more lights
                    const tooCloseToEdge = detected.x < edgeMargin ||
                        detected.y < edgeMargin ||
                        detected.x > (canvas.width - edgeMargin) ||
                        detected.y > (canvas.height - edgeMargin);

                    if (tooCloseToEdge) {
                        console.log(`🚫 FILTERED: Light at (${detected.x}, ${detected.y}) too close to edge`);
                        return false;
                    }
                    return true;
                })
                .map(detected => ({
                    position: [detected.x * scaleX, detected.y * scaleY],
                    color: detected.color,
                    radius: detected.radius * Math.min(scaleX, scaleY) // Scale radius by smaller factor to maintain proportions
                }));

            console.log(`✅ FINAL RESULT: ${lights.length} lights after filtering`);
            return lights;

        } catch (error) {
            console.error("Failed to extract lights from PNG:", error);
            return [];
        }
    }

    /**
     * Load an image from URL
     */
    private static loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous"; // Enable CORS for local files
            img.onload = () => resolve(img);
            img.onerror = error => reject(new Error(`Failed to load image: ${error}`));
            img.src = url;
        });
    }

    /**
     * Detect light areas from pixel data
     */
    private static detectLightAreas(
        pixels: Uint8ClampedArray,
        width: number,
        height: number,
        config: LightmapConfig
    ): DetectedLight[] {
        const lights: DetectedLight[] = [];
        const visited = new Set<string>();

        // Scan for bright pixels
        let scanCount = 0;
        let brightPixelCount = 0;
        for (let y = 0; y < height; y += 3) { // Sample every 3 pixels for better coverage
            for (let x = 0; x < width; x += 3) {
                scanCount++;
                const key = `${x},${y}`;
                if (visited.has(key)) continue;

                const pixelIndex = (y * width + x) * 4;
                const r = pixels[pixelIndex];
                const g = pixels[pixelIndex + 1];
                const b = pixels[pixelIndex + 2];
                const a = pixels[pixelIndex + 3];

                // Skip transparent pixels
                if (a < 128) continue;

                // Calculate brightness
                const brightness = Math.max(r, g, b);

                if (brightness >= config.brightnessThreshold) {
                    brightPixelCount++;
                    console.log(`🔍 BRIGHT PIXEL: (${x}, ${y}) RGB(${r},${g},${b}) brightness=${brightness} (threshold=${config.brightnessThreshold})`);
                    // Found a bright pixel, analyze the light area
                    const lightData = this.analyzeLightArea(
                        pixels, width, height, x, y, config, visited
                    );

                    if (lightData) {
                        console.log(`✅ LIGHT CREATED: pos(${lightData.x}, ${lightData.y}) brightness=${lightData.brightness}`);
                        lights.push(lightData);
                    } else {
                        console.log(`❌ LIGHT REJECTED: analysis at (${x}, ${y}) failed validation`);
                    }
                }
            }
        }
        console.log(`🔍 SCAN COMPLETE: Scanned ${scanCount} pixels, found ${brightPixelCount} bright pixels, created ${lights.length} lights`);

        // Filter out lights that are too close to each other
        const filtered = this.filterNearbyLights(lights, config.minDistance);
        console.log(`🔍 FILTER COMPLETE: ${lights.length} → ${filtered.length} lights after distance filtering`);
        return filtered;
    }

    /**
     * Analyze a light area starting from a bright pixel
     */
    private static analyzeLightArea(
        pixels: Uint8ClampedArray,
        width: number,
        height: number,
        startX: number,
        startY: number,
        config: LightmapConfig,
        visited: Set<string>
    ): DetectedLight | null {
        const lightPixels: Array<{ x: number, y: number, r: number, g: number, b: number, brightness: number; }> = [];
        const queue: Array<{ x: number, y: number; }> = [{ x: startX, y: startY }];

        let totalR = 0, totalG = 0, totalB = 0;
        let maxBrightness = 0;
        let minX = startX, maxX = startX, minY = startY, maxY = startY;

        // Flood fill to find connected bright pixels
        while (queue.length > 0) {
            const { x, y } = queue.shift()!;
            const key = `${x},${y}`;

            if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
                continue;
            }

            const pixelIndex = (y * width + x) * 4;
            const r = pixels[pixelIndex];
            const g = pixels[pixelIndex + 1];
            const b = pixels[pixelIndex + 2];
            const a = pixels[pixelIndex + 3];

            if (a < 128) continue;

            const brightness = Math.max(r, g, b);

            if (brightness < config.brightnessThreshold) continue;

            visited.add(key);
            lightPixels.push({ x, y, r, g, b, brightness });

            totalR += r;
            totalG += g;
            totalB += b;
            maxBrightness = Math.max(maxBrightness, brightness);

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            // Add neighbors to queue
            queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
        }

        // Need at least a few pixels to be considered a light
        if (lightPixels.length < 4) return null;

        // Calculate center position (weighted by brightness)
        let centerX = 0, centerY = 0, totalWeight = 0;
        for (const pixel of lightPixels) {
            const weight = pixel.brightness;
            centerX += pixel.x * weight;
            centerY += pixel.y * weight;
            totalWeight += weight;
        }

        if (totalWeight === 0) return null;

        centerX /= totalWeight;
        centerY /= totalWeight;

        // Calculate average color
        let avgR = totalR / lightPixels.length / 255;
        let avgG = totalG / lightPixels.length / 255;
        let avgB = totalB / lightPixels.length / 255;

        // Normalize color to prevent oversaturation and improve color accuracy
        const maxComponent = Math.max(avgR, avgG, avgB);
        if (maxComponent > 0) {
            // Scale down if any component is too high, but preserve color ratios
            const scale = Math.min(1.0, 0.9 / maxComponent);
            avgR *= scale;
            avgG *= scale;
            avgB *= scale;
        }

        // For warm/beige colors, ensure they don't appear as pure green or red
        // If colors are close to each other (beige-like), balance them
        const colorRange = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);
        if (colorRange < 0.3) { // Colors are close together (beige/warm white)
            // Average them out more to get a proper warm tone
            const avg = (avgR + avgG + avgB) / 3;
            avgR = avg * 1.1; // Slightly warm
            avgG = avg * 1.0;
            avgB = avg * 0.8; // Less blue for warmth
        }

        // Calculate radius based on area and brightness
        const area = lightPixels.length;
        const baseRadius = Math.sqrt(area / Math.PI);
        const brightnessMultiplier = maxBrightness / 255;
        const radius = Math.max(
            config.minRadius,
            Math.min(config.maxRadius, baseRadius * config.radiusScale * brightnessMultiplier * 100)
        );

        return {
            x: Math.round(centerX),
            y: Math.round(centerY),
            color: [avgR, avgG, avgB],
            radius,
            brightness: maxBrightness
        };
    }

    /**
     * Filter out lights that are too close to each other, keeping the brighter one
     */
    private static filterNearbyLights(lights: DetectedLight[], minDistance: number): DetectedLight[] {
        const filtered: DetectedLight[] = [];

        for (const light of lights) {
            let tooClose = false;

            for (const existing of filtered) {
                const distance = Math.sqrt(
                    Math.pow(light.x - existing.x, 2) + Math.pow(light.y - existing.y, 2)
                );

                if (distance < minDistance) {
                    tooClose = true;
                    // If this light is brighter, replace the existing one
                    if (light.brightness > existing.brightness) {
                        const index = filtered.indexOf(existing);
                        filtered[index] = light;
                    }
                    break;
                }
            }

            if (!tooClose) {
                filtered.push(light);
            }
        }

        return filtered;
    }
}
