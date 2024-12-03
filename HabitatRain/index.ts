/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import definePlugin from "@utils/types";
import { definePluginSettings, OptionType } from "@api/Settings";

let currentRain: {
  rainOverlay: HTMLDivElement;
  rainSound?: HTMLAudioElement;
  lightningInterval?: number;
} | null = null;

const defaultConfigs = {
  Soft: { numDrops: 30, fallSpeed: 0.5, angle: 0, sound: 'https://cdn.pixabay.com/audio/2024/09/14/audio_536d210a78.mp3' },
  Heavy: { numDrops: 150, fallSpeed: 0.5, angle: 0, sound: 'https://cdn.pixabay.com/audio/2022/04/16/audio_520eb6a5cc.mp3' },
  AngledR: { numDrops: 150, fallSpeed: 0.2, angle: 20, sound: 'https://cdn.pixabay.com/audio/2024/11/03/audio_a64e97be33.mp3' },
  AngledL: { numDrops: 150, fallSpeed: 0.2, angle: -20, sound: 'https://cdn.pixabay.com/audio/2024/11/03/audio_a64e97be33.mp3' },
};

const StartRain = (preset: string = "Heavy", useLightning = true, useSound = true) => {
  if (currentRain) {
    StopRain();
  }

  // Use the values from settings (these are dynamically updated)
  const config = {
    numDrops: settings.store.numDrops,
    fallSpeed: settings.store.fallSpeed,
    angle: settings.store.angle,
    sound: settings.store.sound || defaultConfigs[preset].sound, // Fallback to preset sound
  };

  const rainOverlay = document.createElement("div");
  rainOverlay.className = "rain-overlay";
  rainOverlay.style.position = "fixed";
  rainOverlay.style.top = "0";
  rainOverlay.style.left = "0";
  rainOverlay.style.width = "100vw";
  rainOverlay.style.height = "100vh";
  rainOverlay.style.pointerEvents = "none";
  rainOverlay.style.zIndex = "9999";
  document.body.appendChild(rainOverlay);

  const screenHeight = window.innerHeight;
  for (let i = 0; i < config.numDrops; i++) {
    const raindrop = document.createElement("div");
    raindrop.className = "rain-drop";
    raindrop.style.position = "absolute";
    raindrop.style.top = `${Math.random() * 1}vh`;
    raindrop.style.left = `${Math.random() * 100}vw`;
    raindrop.style.width = "3px";
    raindrop.style.height = "40px";
    raindrop.style.backgroundColor = "rgba(173, 216, 230, 0.08)";
    raindrop.style.animation = config.angle
      ? `fallDiagonal ${Math.random() * 0.2 + (screenHeight / 1000) * config.fallSpeed}s linear infinite`
      : `fall ${Math.random() * 0.2 + (screenHeight / 1000) * config.fallSpeed}s linear infinite`;
    if (config.angle) {
      raindrop.style.setProperty("--angle", config.angle.toString());
    }
    rainOverlay.appendChild(raindrop);
  }

  if (useLightning) {
    const lightning = () => {
      if (Math.random() < 0.1) {
        const flashIntensity = Math.random() * 0.8 + 0.2;
        const flashDuration = Math.random() * 200 + 100;
        rainOverlay.style.backgroundColor = `rgba(173, 216, 230, ${flashIntensity})`;
        setTimeout(() => {
          rainOverlay.style.backgroundColor = "transparent";
        }, flashDuration);
      }
    };

    const lightningInterval = setInterval(lightning, Math.random() * 4000 + 2000);
    currentRain = { rainOverlay, lightningInterval: lightningInterval as unknown as number };
  }

  if (useSound) {
    const rainSound = new Audio(config.sound);
    rainSound.loop = true;
    rainSound.volume = settings.store.rainVolume / 100; // Read volume from settings
    rainSound.play().catch((err) => console.error("Rain sound failed to play:", err));
    currentRain = { ...currentRain, rainSound };
  }

  currentRain = { ...currentRain, rainOverlay };
  console.log(`${preset} rain started with${useLightning ? "" : "out"} lightning and${useSound ? "" : "out"} sound.`);
};

const StopRain = () => {
  if (currentRain) {
    if (currentRain.rainSound) currentRain.rainSound.pause();
    if (currentRain.rainOverlay) currentRain.rainOverlay.remove();
    if (currentRain.lightningInterval) clearInterval(currentRain.lightningInterval);
    currentRain = null;
    console.log("Rain stopped!");
  } else {
    console.warn("No rain to stop!");
  }
};

const updateRainVolume = () => {
  if (currentRain?.rainSound) {
    currentRain.rainSound.volume = settings.store.rainVolume / 100; // Update volume dynamically
    console.log("Rain volume updated to:", settings.store.rainVolume);
  }
};

const updatePresetSettings = (preset: string) => {
  const config = defaultConfigs[preset];
  if (config) {
    settings.store.numDrops = config.numDrops;
    settings.store.fallSpeed = config.fallSpeed;
    settings.store.angle = config.angle;
    settings.store.sound = config.sound; // Update the sound
    console.log("Preset settings applied:", preset);
  }
};

const addStylesAndFilters = () => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fall {
        0% {
          transform: translate(0, -600vh);
        }
        50% {
          transform: translate(0, 150vh);
        }
        100% {
          transform: translate(0, 0vh);
        }
      }

      @keyframes fallDiagonal {
        0% {
          transform: translate(calc(-1 * var(--angle) * 1vw), -150vh);
        }
        100% {
          transform: translate(calc(var(--angle) * 1vw), 150vh);
        }
      }

      .rain-drop {
        position: absolute;
        animation: fall linear infinite;
        width: 100%;
        height: 100%;
        /* Apply a shifted transform to create the refracting offset */
        transform: translate(calc(var(--angle) * 1vw), -2px); /* Offset content under the raindrop */
        transition: transform 0.3s ease;
      }

      .rain-drop:before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.0); /* No color tint */
        transform: translate(2px, 2px); /* Offset the content under the raindrop */
        pointer-events: none; /* Ensures the effect does not block other elements */
      }
    `;
    document.head.appendChild(style);
  };



const start = () => {
  console.log("RainShaderPlugin started!");
  addStylesAndFilters();
  StartRain(settings.store.preset || "Heavy", true, true); // Start with selected preset
};

const stop = () => {
  console.log("RainShaderPlugin stopped!");
  StopRain();
};

const settings = definePluginSettings({
  rainVolume: {
    type: OptionType.SLIDER,
    description: "Set the rain volume (0–100).",
    default: 50,
    markers: [0, 25, 50, 75, 100], // DefinaAAAe the slider markers
    onChange: updateRainVolume, // Update volume dynamically when slider changes
  },
  numDrops: {
    type: OptionType.NUMBER,
    description: "Number of raindrops",
    default: 150,
    min: 0,
    max: 500,
    onChange: () => StartRain(settings.store.preset), // Restart with updated settings
  },
  fallSpeed: {
    type: OptionType.NUMBER,
    description: "Raindrop fall speed",
    default: 0.5,
    min: 0.1,
    max: 2,
    onChange: () => StartRain(settings.store.preset), // Restart with updated settings
  },
  angle: {
    type: OptionType.NUMBER,
    description: "Raindrop fall angle (negative for left, positive for right)",
    default: 0,
    min: -45,
    max: 45,
    onChange: () => StartRain(settings.store.preset), // Restart with updated settings
  },
  sound: {
    type: OptionType.STRING,
    description: "Sound URL for the rain effect",
    default: defaultConfigs.Heavy.sound, // Default to "Heavy" preset sound
    onChange: () => StartRain(settings.store.preset), // Restart with updated settings
  },
  preset: {
    type: OptionType.SELECT,
    description: "Select a preset to reset the settings",
    options: [
      { label: "Heavy", value: "Heavy" },
      { label: "Soft", value: "Soft" },
      { label: "Angled Right", value: "AngledR" },
      { label: "Angled Left", value: "AngledL" },
    ],
    default: "Heavy",
    onChange: (preset: string) => {
      updatePresetSettings(preset);
      StartRain(preset); // Apply preset and restart rain
    },
  },
});

export default definePlugin({
  name: "HabitatRain",
  description: "A Vencord Plugin made so you can enjoy Discord with a relaxing rain effect!",
  authors: [{ name: "PhrogsHabitat", id: 788145360429252610n }],
  version: "1.3.0",
  settings, // Link settings to the plugin
  start,
  stop,
});
