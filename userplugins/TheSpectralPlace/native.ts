/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CspPolicies } from "@main/csp";

// Allow media from phrogshabitat.github.io for this plugin
CspPolicies["https://phrogshabitat.github.io"] = ["media-src"];
CspPolicies["https://plusinsta.github.io"] = ["media-src"];
CspPolicies["https://cdn.pixabay.com"] = ["media-src"];
CspPolicies["https://tympanus.net"] = ["media-src"];
