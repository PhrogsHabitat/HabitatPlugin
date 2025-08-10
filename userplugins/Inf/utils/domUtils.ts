/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { COLORS, CSS_VARS } from "./Constants";
import infiniteCss from "./InfiniteCss";

let infiniteStyle: HTMLStyleElement | null = null;

/**
 * Injects the Infinite plugin CSS styles into the document
 */
export async function injectInfiniteStyles(): Promise<void> {
    if (infiniteStyle) {
        console.warn("Infinite styles already injected");
        return;
    }

    try {
        // Inject core colors as CSS variables
        injectCoreColorsAsCSSVars();

        // Create and inject the main stylesheet
        infiniteStyle = document.createElement("style");
        infiniteStyle.id = "infinite-plugin-styles";
        infiniteStyle.textContent = infiniteCss;
        document.head.appendChild(infiniteStyle);

        console.log("Infinite styles injected successfully");
    } catch (error) {
        console.error("Failed to inject Infinite styles:", error);
        throw error;
    }
}

/**
 * Removes the Infinite plugin CSS styles from the document
 */
export function removeInfiniteStyles(): void {
    if (infiniteStyle?.parentNode) {
        infiniteStyle.parentNode.removeChild(infiniteStyle);
        infiniteStyle = null;
        console.log("Infinite styles removed");
    }

    // Remove CSS variables
    removeCoreColorsFromCSSVars();
}

/**
 * Injects core colors as named CSS variables on :root
 */
function injectCoreColorsAsCSSVars(): void {
    const root = document.documentElement;
    root.style.setProperty(CSS_VARS.PURPLE, COLORS.MIDNIGHT_PURPLE);
    root.style.setProperty(CSS_VARS.BLUE, COLORS.COBALT_BLUE);
    root.style.setProperty(CSS_VARS.RED, COLORS.RUBY_RED);
    root.style.setProperty(CSS_VARS.GRAY, COLORS.STEEL_GRAY);
    root.style.setProperty(CSS_VARS.SUN, COLORS.SUN);
    root.style.setProperty(CSS_VARS.MOON, COLORS.MOON);
}

/**
 * Removes core color CSS variables from :root
 */
function removeCoreColorsFromCSSVars(): void {
    const root = document.documentElement;
    Object.values(CSS_VARS).forEach(varName => {
        root.style.removeProperty(varName);
    });
}

/**
 * Waits for an element to appear in the DOM
 */
export function waitForElement(selector: string, timeout = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) return resolve(element);

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Add timeout to prevent infinite waiting
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Creates a DOM element with specified properties
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    properties: Partial<HTMLElementTagNameMap[K]> = {},
    styles: Partial<CSSStyleDeclaration> = {}
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);

    // Apply properties
    Object.assign(element, properties);

    // Apply styles
    Object.assign(element.style, styles);

    return element;
}

/**
 * Safely removes an element from the DOM
 */
export function removeElement(element: Element | null): void {
    if (element?.parentNode) {
        element.parentNode.removeChild(element);
    }
}

/**
 * Checks if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
        return false;
    }
}

/**
 * Checks if the user prefers high contrast
 */
export function prefersHighContrast(): boolean {
    try {
        return window.matchMedia("(prefers-contrast: high)").matches;
    } catch {
        return false;
    }
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
