/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CORE_COLORS, LIMITS } from "./Constants";

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Maps a value from one range to another
 */
export function mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Gets a core color by index, cycling through the array
 */
export function getCoreColor(index: number): string {
    return CORE_COLORS[index % CORE_COLORS.length];
}

/**
 * Generates a random color from the core color palette
 */
export function getRandomCoreColor(): string {
    return CORE_COLORS[Math.floor(Math.random() * CORE_COLORS.length)];
}

/**
 * Adds alpha transparency to a hex color
 */
export function addAlpha(hexColor: string, alpha: number): string {
    const alphaHex = Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, "0");
    return hexColor + alphaHex;
}

/**
 * Validates and clamps stardust count to acceptable limits
 */
export function validateStardustCount(count: number): number {
    const validatedCount = clamp(count, LIMITS.MIN_STARDUST_COUNT, LIMITS.MAX_STARDUST_COUNT);

    if (validatedCount !== count) {
        console.warn(`Stardust count ${count} exceeds limits, clamped to ${validatedCount}`);
    }

    return validatedCount;
}

/**
 * Generates random position within viewport bounds
 */
export function getRandomPosition(): { x: number; y: number; } {
    return {
        x: Math.random() * 100, // percentage
        y: Math.random() * 100, // percentage
    };
}

/**
 * Generates random animation duration within specified range
 */
export function getRandomDuration(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

/**
 * Converts degrees to radians
 */
export function degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 */
export function radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
}

/**
 * Calculates distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Easing function for smooth animations (ease-in-out)
 */
export function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Easing function for smooth animations (ease-out)
 */
export function easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Generates a unique ID for DOM elements
 */
export function generateId(prefix = "infinite"): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safely parses a number from a string or returns default
 */
export function safeParseNumber(value: any, defaultValue: number): number {
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Throttles a function to execute at most once per specified interval
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Creates a promise that resolves after specified milliseconds
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if a value is within a specified range
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

/**
 * Normalizes a value to 0-1 range
 */
export function normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
}

/**
 * Rounds a number to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
