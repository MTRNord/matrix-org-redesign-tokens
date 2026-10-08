/*
 * SPDX-FileCopyrightText: 2026 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import StyleDictionary from "style-dictionary";
import { register } from "@tokens-studio/sd-transforms";
import { existsSync, readdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
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

/**
 * Token sets whose name starts with this prefix hold component tokens, e.g.
 * `components/button`. Each one is emitted as its own file,
 * `build/css/components/button.css`.
 */
const COMPONENT_PREFIX = "components/";

/**
 * @param {any} node token tree
 * @returns {boolean} whether the tree contains at least one token
 */
const hasTokens = (node) =>
  node !== null &&
  typeof node === "object" &&
  ("$value" in node || Object.values(node).some(hasTokens));

// An empty set, e.g. a component that is still being designed in Penpot,
// produces no CSS file, so it is skipped.
const componentSets = setsOf(baseTheme).filter((s) => {
  if (!s.startsWith(COMPONENT_PREFIX)) return false;
  if (hasTokens(readJson(setFile(s)))) return true;
  console.log(`Skipping ${s}: the set has no tokens yet`);
  return false;
});

// A component set that exists as a file but is not enabled in the themes would
// be missing from the output without any error.
const componentDir = join("tokens", COMPONENT_PREFIX);
const exportedComponents = existsSync(componentDir)
  ? readdirSync(componentDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => COMPONENT_PREFIX + f.slice(0, -".json".length))
  : [];
const disabled = exportedComponents.filter((s) => !themes.every((t) => setsOf(t).includes(s)));
if (disabled.length > 0) {
  throw new Error(`component sets not enabled in every theme: ${disabled.join(", ")}`);
}

/**
 * Collects color tokens of a component set that do not reference a semantic
 * token. Only semantic tokens change between themes, so a palette reference
 * or a literal color would ignore dark mode.
 *
 * @param {any} node token tree
 * @param {string} path dotted path of `node`
 * @param {string[]} out paths of offending tokens
 * @returns {string[]}
 */
const nonSemanticColors = (node, path = "", out = []) => {
  if (node && typeof node === "object") {
    if ("$value" in node) {
      const value = node.$value;
      const isSemanticReference =
        typeof value === "string" && /^\{[^}]+\}$/.test(value) && !value.startsWith("{palette.");
      if (node.$type === "color" && !isSemanticReference) out.push(`${path} = ${value}`);
    } else {
      for (const [key, child] of Object.entries(node)) {
        nonSemanticColors(child, path ? `${path}.${key}` : key, out);
      }
    }
  }
  return out;
};
for (const set of componentSets) {
  const offending = nonSemanticColors(readJson(setFile(set)));
  if (offending.length > 0) {
    throw new Error(
      `${set}: color tokens must reference a semantic token, not a palette or fixed color:\n  ${offending.join("\n  ")}`,
    );
  }
}

const passes = [
  {
    source: sourcesFor(setsOf(baseTheme)),
    dest: "variables",
    utilities: true,
    components: componentSets.map((s) => ({
      name: s.slice(COMPONENT_PREFIX.length),
      file: setFile(s),
    })),
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

// Every custom property must be declared in exactly one of these files. A
// component token like `button.radius` would otherwise silently override a
// global `button-radius`. Theme overrides redeclare base names on purpose,
// so their files are not part of this check.
const declaredIn = new Map();
for (const file of ["_variables.css", ...componentSets.map((s) => `components/${s.slice(COMPONENT_PREFIX.length)}.css`)]) {
  const css = readFileSync(join("build", "css", file), "utf8");
  for (const [, name] of css.matchAll(/^\s*(--[\w-]+):/gm)) {
    if (declaredIn.has(name)) {
      throw new Error(`${name} is declared in both ${declaredIn.get(name)} and ${file}. Rename one of the tokens.`);
    }
    declaredIn.set(name, file);
  }
}

// Import order matters: theme overrides follow the base variables, and the
// component files reference both.
const cssFiles = [
  "fonts.css",
  ...passes.map((p) => `_${p.dest}.css`),
  ...componentSets.map((s) => `components/${s.slice(COMPONENT_PREFIX.length)}.css`),
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
