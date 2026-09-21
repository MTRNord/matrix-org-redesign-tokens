# Matrix.org design tokens

Design tokens for the matrix.org redesign, exported from our Penpot instance and converted to CSS with [Style Dictionary](https://styledictionary.com/).

## Building

```sh
npm install
npm run build
```

The CSS ends up in `build/css/`.

## Updating tokens

Export the tokens from Penpot in the multi-file format and replace the contents of `tokens/` with the export.

`tokens/extra/` is not part of the Penpot export. It is maintained by hand and holds information Penpot has no place for, currently the font files used to generate `fonts.css`. Keep it when replacing the export.
