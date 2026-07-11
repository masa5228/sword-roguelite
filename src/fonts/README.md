# Fonts

## DotGothic16

- Font: DotGothic16
- License: SIL Open Font License 1.1
- Author credit: Fontworks Inc.
- Source: Google Fonts DotGothic16, https://fonts.google.com/specimen/DotGothic16
- Distributed file: `DotGothic16-Subset.woff2`
- Distribution source: fontsource Japanese subset woff2, https://fontsource.org/fonts/dotgothic16
- License text: `OFL.txt` is included in this directory.

## Re-subsetting

The checked-in woff2 is intentionally self-hosted and should be regenerated offline from a local DotGothic16 font file when the display glyph set changes.

Example using fonttools:

```bash
pyftsubset DotGothic16-Regular.ttf \
  --output-file=DotGothic16-Subset.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --unicodes='U+0020-007E,U+3000-30FF,U+4E00-9FFF'
```

Adjust `--unicodes` or use `--text-file=<glyph-list.txt>` if the UI display font needs a smaller or more exact glyph set.
