# Matrix.org design tokens

Design tokens for the matrix.org redesign, exported from our Penpot instance and converted to CSS with [Style Dictionary](https://styledictionary.com/).

## Building

```sh
npm install
npm run build
```

The CSS ends up in `build/css/`. Run `npm test` to build and check the output.

## Updating tokens

Export the tokens from Penpot in the multi-file format and replace the contents of `tokens/` with the export.

`tokens/extra/` is not part of the Penpot export. It is maintained by hand and holds information Penpot has no place for, currently the font files used to generate `fonts.css`. Keep it when replacing the export.

Token names are lowercase with words separated by hyphens, for example `primary-text-color`.

## Using the CSS

Import `build/css/index.css`, or the individual files:

| File | Contents |
| --- | --- |
| `fonts.css` | `@font-face` rules for the fonts in `tokens/extra/font.json` |
| `_variables.css` | All tokens as custom properties on `:root`, with light theme values |
| `_variables.mode.dark.css` | Dark theme values, applied with `@media (prefers-color-scheme: dark)` |
| `typography.css` | A `.text-<name>` class for each typography token, e.g. `.text-h1`. The `H1` to `H6` tokens also style the `h1` to `h6` elements. |

The element styles use `:where()`, so any class or element selector on the site overrides them.

The light theme is always the base. Other themes need an entry in `MEDIA_QUERY_FOR` in `build.mjs`.

### Fonts

The font files are not part of this repository. The site has to serve them as woff2 under `/fonts/`, using the file names from `tokens/extra/font.json`.

Fonts used above the fold should be preloaded in the page `<head>`:

```html
<link rel="preload" href="/fonts/HankenGrotesk-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Lora-Light.woff2" as="font" type="font/woff2" crossorigin>
```

The `crossorigin` attribute is needed even for fonts on the same domain. Without it the browser downloads the font twice.

## Notes

Penpot exports typography tokens with plural keys such as `fontSizes`. The `penpot/typography` preprocessor in `sd.config.mjs` renames them to the names Style Dictionary expects. It can be removed once [penpot#8140](https://github.com/penpot/penpot/issues/8140) is fixed.
