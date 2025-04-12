/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Plugin } from "@vencord/types";

export default class TestPlugin extends Plugin {
    start() {
        document.body.style.backgroundColor = "blue"; // Example action to test it
    }

    stop() {
        document.body.style.backgroundColor = ""; // Reset the background
    }
}
