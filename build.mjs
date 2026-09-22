/*
 * SPDX-FileCopyrightText: 2026 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import StyleDictionary from "style-dictionary";
import { register } from "@tokens-studio/sd-transforms";
import { existsSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileHeader } from "style-dictionary/utils";
import getConfig, { fontsConfig, licenseHeader } from "./sd.config.mjs";

register(StyleDictionary);

/**
 * Theme emitted without a media query under `:root`.
 *
 * Fixed here instead of read from `$metadata.activeThemes`, because that
 * field holds the theme last selected in the Penpot UI.
 */
const BASE_THEME = "Mode/Light";

/**
 * Media query for each theme other than the base theme. A theme without an
 * entry fails the build, as it would otherwise override the base theme.
 */
const MEDIA_QUERY_FOR = {
  "Mode/Dark": "(prefers-color-scheme: dark)",
};

/**
 * Path of a token set file. The Penpot multi-file export uses the set name
 * as path, e.g. `mode/dark` is `tokens/mode/dark.json`.
 *
 * @param {string} setName Penpot token set name
 * @returns {string}
 */
const setFile = (setName) => join("tokens", `${setName}.json`);

/**
 * @param {string} path
 * @returns {any}
 */
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/**
 * @param {string} s
 * @returns {string}
 */
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const themes = readJson(setFile("$themes"));
const metadata = readJson(setFile("$metadata"));

const themeId = (t) => `${t.group}/${t.name}`;
const setsOf = (t) => Object.keys(t.selectedTokenSets);

/**
 * Token files for the given sets, in Penpot's precedence order.
 *
 * @param {string[]} setNames Penpot token set names
 * @returns {string[]}
 */
const sourcesFor = (setNames) =>
  metadata.tokenSetOrder.filter((s) => setNames.includes(s)).map(setFile);

const baseTheme = themes.find((t) => themeId(t) === BASE_THEME);
if (!baseTheme) {
  throw new Error(`$themes.json has no '${BASE_THEME}' theme.`);
}

const passes = [
  {
    source: sourcesFor(setsOf(baseTheme)),
    dest: "variables",
    utilities: true,
  },
  ...themes
    .filter((t) => t !== baseTheme)
    .map((t) => {
      const media = MEDIA_QUERY_FOR[themeId(t)];
      if (!media) {
        throw new Error(`no media query configured for theme '${themeId(t)}'.`);
      }
      const ownSets = setsOf(t).filter((s) => !setsOf(baseTheme).includes(s));
      return {
        // All sets are loaded so references resolve, but only tokens from
        // the theme's own sets are emitted.
        source: sourcesFor(setsOf(t)),
        onlyFiles: ownSets.map(setFile),
        dest: `variables.${kebab(t.group)}.${kebab(t.name)}`,
        media,
      };
    }),
];

rmSync("build", { recursive: true, force: true });

await new StyleDictionary(
  fontsConfig([join("tokens", "extra", "font.json")]),
).buildAllPlatforms();

for (const pass of passes) {
  await new StyleDictionary(getConfig(pass)).buildAllPlatforms();
}

// Import order matters: theme overrides follow the base variables.
const cssFiles = [
  "fonts.css",
  ...passes.map((p) => `_${p.dest}.css`),
  "base.css",
  "typography.css",
];
const missing = cssFiles.filter((f) => !existsSync(join("build", "css", f)));
if (missing.length > 0) {
  throw new Error(`index.css imports files that were not built: ${missing.join(", ")}`);
}
const imports = cssFiles.map((f) => `@import url("${f}");`);
const indexHeader = await fileHeader({
  file: { options: { fileHeader: licenseHeader } },
});
writeFileSync("build/css/index.css", indexHeader + imports.join("\n") + "\n");

console.log(`Built ${passes.length} theme pass(es)`);
