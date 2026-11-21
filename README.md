# eqset

A LaTeX equation editor that runs entirely in the browser. Type LaTeX, see it typeset as you go,
and export the equation as a vector **SVG** or a high-resolution **PNG**. It is a static site with
no build step, so it publishes to GitHub Pages as is.

## Features

- **Editor** (CodeMirror 5) with LaTeX highlighting, line numbers, bracket matching and automatic
  closing of `{}`. Escaped braces such as `\{` are left alone.
- **Suggestions.** Type `\` and a letter, or press `Ctrl`+`Space` (or `Alt`+`Space`). Every
  suggestion shows the rendered symbol. Matching covers prefixes, keywords ("infinity" finds `\infty`)
  and fuzzy input (`lra` finds `\leftrightarrow`).
- **Tab stops.** Inserting `\frac{}{}` puts the cursor in the numerator, and `Tab` / `Shift`+`Tab`
  move between fields. This also works with nested structures.
- **Environments.** `\begin{` suggests matrices, cases, aligned and so on, and inserts the matching
  `\end{…}`. `\end{` suggests the environment that is still open.
- **Symbol palette.** About 575 symbols and structures in 14 categories, all searchable. If you select
  text and then click a structure, the selection is wrapped in it.
- **Live preview** on a transparency checkerboard. Crop marks show the exact exported extent,
  padding included. Zoom is "Fit" or 50–800%, and 100% means actual size. If the LaTeX has an error,
  the last good render stays on screen and the error message appears below it.
- **Export settings:** font size in pt, scale multiplier, color, transparent or colored background,
  padding, PNG resolution (dpi), SVG size unit (pt or px), and file name.
- **Export actions:** download SVG or PNG, copy the SVG code, copy the PNG image, copy LaTeX, and copy
  MathML (it pastes into Microsoft Word as an editable equation).
- **Templates** (quadratic formula, Maxwell's equations, matrices, piecewise functions, chemistry and
  more) and **saved equations**, in the Insert tray under the editor. Also **share links**, autosave,
  and light and dark themes.
- **Legible by design.** The UI uses Atkinson Hyperlegible Next and Mono, both made for low-vision
  readers. Contrast meets WCAG AA in both themes, every control has a visible focus state, and
  `prefers-reduced-motion` is respected.

### How sizes work

MathJax lays out formulas in units of 1/1000 em. An equation exported at *F* pt with scale *s*
is `viewBoxWidth / 1000 × F × s` pt wide, so a 12 pt equation matches 12 pt body text when placed
at 100%. Padding is given in CSS px (1 px = 0.75 pt).

PNGs are drawn from the vector at `pt / 72 × dpi` pixels. The file records the dpi (a `pHYs` chunk),
so Word, PowerPoint and Keynote place it at the intended physical size. Browsers limit canvas size,
so a very large PNG is scaled down to fit and you get a warning. The recorded dpi is lowered to
match, which keeps the physical size correct.

Exported SVGs are self-contained. Every glyph is an inline `<path>`, with no fonts, `<use>`
references or `currentColor`, and the LaTeX source is stored in `<title>`.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `\` + letters, `Ctrl`/`Alt`+`Space` | Suggestions |
| `Tab` / `Shift`+`Tab` | Next / previous field of an inserted structure |
| `Esc` then `Tab` | Move focus out of the editor |
| `Ctrl`/`⌘`+`S` | Download SVG |
| `Ctrl`/`⌘`+`Shift`+`S` | Download PNG |

## Notes and limits

- Rendering uses MathJax 3's full TeX build: AMS math, mathtools, cancel, color, mhchem (`\ce`,
  `\pu`), braket, amscd, extpfeil, gensymb and others. Undefined commands are reported as errors.
  The `html` extension (`\href`, `\style`) and `\require` are turned off, so shared links can't inject
  links or load code.
- Letters that the TeX fonts don't include, such as accented or CJK characters in `\text{}`, are drawn
  with the viewer's serif font. In an SVG they stay as text, so they rely on that font being present.
- An equation with `\tag{…}` is exported as a full centered line, the way LaTeX lays it out, with the
  label on the right.

## Run locally

```sh
npm start        # python3 -m http.server 8000, then open http://localhost:8000
npm test         # unit tests (Node 22+), no dependencies
```

The page has to be served over HTTP. Opening `index.html` from `file://` blocks ES modules.

## Publish on GitHub Pages

1. Push this folder to a repository.
2. In **Settings → Pages**, choose **Deploy from a branch**, then select the branch and `/ (root)`.

All paths are relative, so the site works at `https://<user>.github.io/<repo>/` and on a custom
domain. To use a custom domain, add a `CNAME` file containing it. `.nojekyll` is already included.

## Privacy

Everything runs locally. Your equations, settings and saved items stay in this browser's
`localStorage`. The page makes no network requests beyond loading its own files.

## Third-party code

MathJax 3.2.2 (Apache-2.0), CodeMirror 5.65.18 (MIT) and the Atkinson Hyperlegible Next and Mono
fonts (OFL-1.1) are vendored in `vendor/`. See `vendor/README.md`. The visual system is described
in `DESIGN.md` and the product brief in `PRODUCT.md`.
