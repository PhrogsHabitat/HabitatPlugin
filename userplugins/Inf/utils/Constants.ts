/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Core color palette for the Infinite theme
export const CORE_COLORS = [
    "#280137", // midnightPurple
    "#0047AB", // cobaltBlue
    "#9B111E", // rubyRed
    "#738595", // steelGray
    "#F1C40F", // yellow (sun)
    "#ECF0F1", // light (moon/stardust)
] as const;

// Named color exports for easier usage
export const COLORS = {
    MIDNIGHT_PURPLE: "#280137",
    COBALT_BLUE: "#0047AB",
    RUBY_RED: "#9B111E",
    STEEL_GRAY: "#738595",
    SUN: "#F1C40F",
    MOON: "#ECF0F1",
} as const;

// Asset URLs for the Infinite theme
export const ASSETS = {
    // Background images
    GALAXY_BACKGROUND: "https://phrogshabitat.github.io/inf.webp",
    // Mist layer images
    MIST_FRONT: "https://phrogshabitat.github.io/MISTFront.png",
    MIST_MID: "https://phrogshabitat.github.io/MISTMid.png",
    MIST_BACK: "https://phrogshabitat.github.io/MISTBack.png",
} as const;

// CSS variable names for theming
export const CSS_VARS = {
    PURPLE: "--infPURP",
    BLUE: "--infBLUE",
    RED: "--infRED",
    GRAY: "--infWHITE",
    SUN: "--infSUN",
    MOON: "--infMOON",
} as const;

// Animation configuration constants
export const ANIMATION = {
    STARDUST_MIN_DURATION: 8,
    STARDUST_MAX_DURATION: 14,
    STARDUST_SIZE: 6,
    STARDUST_BLUR: 1,

    SUN_MOON_CYCLE_DURATION: 120000, // 2 minutes
    SUN_MOON_SIZE: 80,

    MIST_WRAP_WIDTH: 3000,
    MIST_HEIGHT_SCALE: 1.3,
    MIST_BLUR: 1.2,
} as const;

// Limits and validation constants
export const LIMITS = {
    MAX_STARDUST_COUNT: 200,
    MIN_STARDUST_COUNT: 0,
    MAX_MIST_LAYERS: 3,
} as const;

// Z-index layers for proper stacking
export const Z_INDEX = {
    GALAXY_BACKGROUND: -1,
    MIST_BACK: 1000,
    MIST_MID: 1001,
    MIST_FRONT: 1002,
    STARDUST: 9999,
    SUN_MOON: 10000,
    LOADING_OVERLAY: 10001,
} as const;
