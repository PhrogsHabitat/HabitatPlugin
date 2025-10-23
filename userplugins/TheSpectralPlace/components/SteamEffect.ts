/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// SteamEffect.ts - Updated for burst-based steam
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../utils/settingsStore";
import * as WebGLSteamEffect from "./WebGLSteamEffect";

export function setup() {
    if (!settings.store.enableSteam) return;
    WebGLSteamEffect.setup();
}

export function remove() {
    WebGLSteamEffect.cleanup();
}

export function update() {
    WebGLSteamEffect.update();
}

export function animate(deltaTime: number) {
    // Handled by WebGL animation loop
}

export function handleResize() {
    WebGLSteamEffect.handleResize();
}

export function triggerSteamSoundEffect() {
    // This can still be used to manually trigger a steam burst
    WebGLSteamEffect.triggerSteamBurst();
}
