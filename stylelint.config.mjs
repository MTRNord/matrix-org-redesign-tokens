/*
 * SPDX-FileCopyrightText: 2026 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Checks the generated CSS in `build/css/`, e.g. after a change in the
 * Penpot export format.
 *
 * Stylelint does not validate custom property values, so the unit checks
 * match the generated property names explicitly.
 *
 * @type {import("stylelint").Config}
 */
export default {
  referenceFiles: ["build/css/_variables.css"],
  rules: {
    "color-no-hex": true,
    "custom-property-pattern": "^[a-z0-9]+(-[a-z0-9]+)*$",
    "selector-class-pattern": "^(text-[a-z0-9]+(-[a-z0-9]+)*|link|background)$",
    // Unitless font sizes and letter spacing, except for 0.
    "declaration-property-value-disallowed-list": {
      "/^--.+-(font-size|letter-spacing)$/": ["/^-?(?!0*\\.?0+$)\\d*\\.?\\d+$/"],
    },
    "declaration-property-value-no-unknown": true,
    "no-unknown-custom-properties": true,
    "function-no-unknown": true,
    "property-no-unknown": true,
  },
};
