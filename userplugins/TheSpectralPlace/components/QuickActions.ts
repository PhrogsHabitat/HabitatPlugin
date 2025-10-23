/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../utils/settingsStore";

interface QuickAction {
    id: string;
    icon: string;
    label: string;
    type: "slider" | "toggle";
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: any) => void;
    getValue: () => any;
}

export class QuickActions {
    private container: HTMLDivElement;
    private mainBubble: HTMLDivElement;
    private actionsContainer: HTMLDivElement;
    private expanded = false;
    private dragging = false;
    private position = { x: window.innerWidth - 100, y: window.innerHeight - 100 };
    private dragStartPos = { x: 0, y: 0 };
    private activeAction: string | null = null;
    private clickTimer: number | null = null;
    private potentialClick = false;
    private snapThreshold = 50;
    private snapPoints: Array<{ x: number, y: number; }> = [];

    private quickActions: QuickAction[] = [
        {
            id: "mechanicalVolume",
            icon: "🔊",
            label: "Mechanical Volume",
            type: "slider",
            min: 0,
            max: 500,
            step: 1,
            getValue: () => settings.store.mechanicalVolume,
            onChange: value => {
                settings.store.mechanicalVolume = value;
                import("./MechanicalEffect.js").then(m => m.updateVolume());
            }
        },
        {
            id: "gearDensity",
            icon: "⚙️",
            label: "Gear Density",
            type: "slider",
            min: 0,
            max: 5,
            step: 0.01,
            getValue: () => settings.store.gearDensity,
            onChange: value => {
                settings.store.gearDensity = value;
                import("./WebGLSteampunkEffect.js").then(m => m.update());
            }
        },
        {
            id: "steam",
            icon: "💨",
            label: "Steam Intensity",
            type: "slider",
            min: 0,
            max: 3,
            step: 0.01,
            getValue: () => settings.store.steamIntensity,
            onChange: value => {
                settings.store.steamIntensity = value;
                import("./SteamEffect.js").then(m => m.update());
            }
        },
        {
            id: "mechanical",
            icon: "🔧",
            label: "Mechanical Sounds",
            type: "toggle",
            getValue: () => settings.store.enableMechanical,
            onChange: value => {
                settings.store.enableMechanical = value;
                import("./MechanicalEffect.js").then(m =>
                    value ? m.enableMechanical() : m.disableMechanical()
                );
            }
        },
        {
            id: "background",
            icon: "🏭",
            label: "Steampunk BG",
            type: "toggle",
            getValue: () => settings.store.showSteampunkBackground,
            onChange: value => {
                settings.store.showSteampunkBackground = value;
                import("./SteampunkBackground.js").then(m =>
                    value ? m.setup() : m.remove()
                );
            }
        },
        {
            id: "brassTarnish",
            icon: "🕰️",
            label: "Brass Tarnish",
            type: "slider",
            min: 0,
            max: 1,
            step: 0.01,
            getValue: () => settings.store.brassTarnish,
            onChange: value => {
                settings.store.brassTarnish = value;
                import("./WebGLSteampunkEffect.js").then(m => m.update());
            }
        }
    ];

    constructor() {
        this.container = document.createElement("div");
        this.container.id = "steampunk-quick-actions";
        this.container.className = "steampunk-quick-actions";
        this.container.style.cssText = `
            position: fixed;
            z-index: 9999;
            pointer-events: auto;
            width: 40px;
            height: 40px;
            transform: translate(-50%, -50%);
        `;

        this.mainBubble = document.createElement("div");
        this.mainBubble.className = "steampunk-main-bubble";
        this.mainBubble.textContent = "⚙️";
        this.mainBubble.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--background-primary);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 20px;
            cursor: move;
            z-index: 100;
            transition: transform 0.3s ease, background 0.2s ease;
            user-select: none;
        `;

        this.actionsContainer = document.createElement("div");
        this.actionsContainer.className = "steampunk-actions-container";
        this.actionsContainer.style.cssText = `
            position: absolute;
            pointer-events: none;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
        `;

        this.container.appendChild(this.mainBubble);
        this.container.appendChild(this.actionsContainer);
        document.body.appendChild(this.container);

        this.updateSnapPoints();
        this.updatePosition();
        this.setupEventListeners();
        this.createActionBubbles();
        this.setupDocumentListener();

        window.addEventListener("resize", this.updateSnapPoints.bind(this));
    }

    private updateSnapPoints() {
        this.snapPoints = [
            { x: 20, y: 20 }, // Top-left
            { x: window.innerWidth - 20, y: 20 }, // Top-right
            { x: 20, y: window.innerHeight - 20 }, // Bottom-left
            { x: window.innerWidth - 20, y: window.innerHeight - 20 } // Bottom-right
        ];
    }

    private updatePosition() {
        this.container.style.left = `${this.position.x}px`;
        this.container.style.top = `${this.position.y}px`;
    }

    private createActionBubbles() {
        this.actionsContainer.innerHTML = "";
        this.quickActions.forEach((action, i) => {
            const bubble = document.createElement("div");
            bubble.className = "steampunk-action-bubble";
            bubble.dataset.id = action.id;
            bubble.innerHTML = `<div class="steampunk-action-icon">${action.icon}</div>`;
            bubble.style.cssText = `
                position: absolute;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: var(--background-primary);
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 16px;
                cursor: pointer;
                pointer-events: auto;
                box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
                transition:
                    left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                    top 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
                    opacity 0.3s ease,
                    background 0.2s ease,
                    transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                transform: scale(0);
                opacity: 0;
                z-index: 90;
                user-select: none;
                left: 4px;
                top: 4px;
            `;

            bubble.addEventListener("click", e => {
                e.stopPropagation();
                if (this.activeAction === action.id) {
                    this.closeActiveControl();
                } else {
                    this.showActionControl(action);
                }
            });

            this.actionsContainer.appendChild(bubble);
        });
    }

    private showActionControl(action: QuickAction) {
        this.closeActiveControl();
        this.activeAction = action.id;

        const bubble = this.actionsContainer.querySelector(`[data-id="${action.id}"]`);
        if (!bubble) return;

        bubble.classList.add("active");

        let control = bubble.querySelector(".steampunk-action-control") as HTMLDivElement;
        if (!control) {
            control = document.createElement("div");
            control.className = "steampunk-action-control";
            control.style.cssText = `
                position: absolute;
                left: 40px;
                top: 50%;
                transform: translateY(-50%);
                background: var(--background-secondary);
                border-radius: 8px;
                padding: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                width: 160px;
                z-index: 5;
                animation: steampunk-fade-in 0.2s ease;
            `;

            const label = document.createElement("div");
            label.className = "steampunk-action-label";
            label.textContent = action.label;
            label.style.cssText = `
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 4px;
                color: var(--header-primary);
            `;
            control.appendChild(label);

            if (action.type === "slider") {
                const slider = document.createElement("input");
                slider.type = "range";
                slider.min = String(action.min);
                slider.max = String(action.max);
                slider.step = String(action.step);
                slider.value = String(action.getValue());
                slider.style.width = "100%";
                slider.addEventListener("input", e => {
                    const value = parseFloat((e.target as HTMLInputElement).value);
                    action.onChange(value);
                });
                control.appendChild(slider);
            } else {
                const toggleContainer = document.createElement("label");
                toggleContainer.className = "steampunk-toggle-switch";
                toggleContainer.style.cssText = `
                    position: relative;
                    display: inline-block;
                    width: 40px;
                    height: 20px;
                `;

                const toggle = document.createElement("input");
                toggle.type = "checkbox";
                toggle.checked = action.getValue();
                toggle.addEventListener("change", e => {
                    action.onChange((e.target as HTMLInputElement).checked);
                });

                const slider = document.createElement("span");
                slider.className = "slider";
                slider.style.cssText = `
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--background-modifier-accent);
                    transition: .4s;
                    border-radius: 20px;
                `;

                const sliderKnob = document.createElement("span");
                sliderKnob.style.cssText = `
                    position: absolute;
                    height: 16px;
                    width: 16px;
                    left: 2px;
                    bottom: 2px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                `;
                slider.appendChild(sliderKnob);

                toggleContainer.appendChild(toggle);
                toggleContainer.appendChild(slider);
                control.appendChild(toggleContainer);
            }

            bubble.appendChild(control);
        }

        control.style.display = "block";
    }

    private closeActiveControl() {
        if (this.activeAction) {
            const bubble = this.actionsContainer.querySelector(`[data-id="${this.activeAction}"]`);
            if (bubble) bubble.classList.remove("active");

            const control = bubble?.querySelector(".steampunk-action-control") as HTMLDivElement;
            if (control) {
                control.style.animation = "steampunk-fade-out 0.2s ease";
                setTimeout(() => {
                    if (control.parentNode) {
                        control.style.display = "none";
                        control.style.animation = "";
                        control.remove();
                    }
                }, 200);
            }
            this.activeAction = null;
        }
    }

    private setupDocumentListener() {
        document.addEventListener("click", e => {
            if (this.activeAction && !this.container.contains(e.target as Node)) {
                this.closeActiveControl();
            }
        });
    }

    private setupEventListeners() {
        this.mainBubble.addEventListener("mousedown", this.startDrag.bind(this));
        document.addEventListener("mousemove", this.handleDrag.bind(this));
        document.addEventListener("mouseup", this.stopDrag.bind(this));

        this.mainBubble.addEventListener("click", e => {
            if (this.potentialClick) {
                this.toggleExpanded();
                e.stopPropagation();
            }
        });
    }

    private startDrag(e: MouseEvent) {
        if (e.button !== 0) return;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.potentialClick = true;
        this.dragging = false;
        this.closeActiveControl();

        this.clickTimer = window.setTimeout(() => {
            this.dragging = true;
            this.potentialClick = false;
            this.mainBubble.classList.add("dragging");
        }, 200);

        e.stopPropagation();
    }

    private handleDrag(e: MouseEvent) {
        if (!this.clickTimer) return;

        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            if (!this.dragging) {
                this.dragging = true;
                this.potentialClick = false;
                this.mainBubble.classList.add("dragging");
                this.closeActiveControl();
            }
        }

        if (this.dragging) {
            this.position = {
                x: Math.max(0, Math.min(window.innerWidth, this.position.x + dx)),
                y: Math.max(0, Math.min(window.innerHeight, this.position.y + dy))
            };

            this.updatePosition();
            this.dragStartPos = { x: e.clientX, y: e.clientY };
        }
    }

    private stopDrag() {
        if (this.clickTimer) {
            clearTimeout(this.clickTimer);
            this.clickTimer = null;
        }

        if (this.dragging) {
            this.dragging = false;
            this.mainBubble.classList.remove("dragging");
            this.snapToClosestPoint();
        }
    }

    private snapToClosestPoint() {
        let minDist = Infinity;
        let closestPoint: { x: number; y: number; } | null = null;

        for (const point of this.snapPoints) {
            const dx = this.position.x - point.x;
            const dy = this.position.y - point.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.snapThreshold && dist < minDist) {
                minDist = dist;
                closestPoint = point;
            }
        }

        if (closestPoint) {
            this.position = { x: closestPoint.x, y: closestPoint.y };
            this.animateToPosition();
        }
    }

    private animateToPosition() {
        const startX = parseFloat(this.container.style.left || "0");
        const startY = parseFloat(this.container.style.top || "0");
        const startTime = performance.now();
        const duration = 300;

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeOutCubic(progress);

            const currentX = startX + (this.position.x - startX) * eased;
            const currentY = startY + (this.position.y - startY) * eased;

            this.container.style.left = `${currentX}px`;
            this.container.style.top = `${currentY}px`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    private easeOutCubic(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }

    private toggleExpanded() {
        this.expanded = !this.expanded;
        this.mainBubble.classList.toggle("expanded", this.expanded);

        const bubbles = this.actionsContainer.querySelectorAll(".steampunk-action-bubble");
        const radius = 60;

        bubbles.forEach((bubble, i) => {
            const angle = (i / bubbles.length) * Math.PI * 2;
            const x = 20 + Math.cos(angle) * radius;
            const y = 20 + Math.sin(angle) * radius;

            if (this.expanded) {
                (bubble as HTMLDivElement).style.left = `${x - 16}px`;
                (bubble as HTMLDivElement).style.top = `${y - 16}px`;
                (bubble as HTMLDivElement).style.transform = "scale(1)";
                (bubble as HTMLDivElement).style.opacity = "1";
            } else {
                (bubble as HTMLDivElement).style.left = "4px";
                (bubble as HTMLDivElement).style.top = "4px";
                (bubble as HTMLDivElement).style.transform = "scale(0)";
                (bubble as HTMLDivElement).style.opacity = "0";
            }
        });
    }

    public remove() {
        this.container.remove();
        window.removeEventListener("resize", this.updateSnapPoints.bind(this));
        document.removeEventListener("mousemove", this.handleDrag.bind(this));
        document.removeEventListener("mouseup", this.stopDrag.bind(this));
        document.removeEventListener("click", this.setupDocumentListener.bind(this));
    }
}
