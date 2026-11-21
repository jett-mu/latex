# Vendored libraries

These files are copied unmodified from the npm packages below (fonts from `@fontsource-variable/atkinson-hyperlegible-next` and `-mono`), so the site works offline and on
GitHub Pages without a build step or CDN.

| Library | Version | Files | License |
| --- | --- | --- | --- |
| [MathJax](https://www.mathjax.org/) | 3.2.2 | `mathjax/tex-svg-full.js` (from `es5/`) | Apache-2.0, `mathjax/LICENSE` |
| [Atkinson Hyperlegible Next / Mono](https://www.brailleinstitute.org/freefont/) | 5.3.0 (Fontsource) | `fonts/*-latin-wght-normal.woff2`, `fonts/*-latin-ext-wght-normal.woff2` (variable) | OFL-1.1, `fonts/LICENSE-next.txt`, `fonts/LICENSE-mono.txt` |
| [CodeMirror](https://codemirror.net/5/) | 5.65.18 | `codemirror/codemirror.js`, `codemirror.css` (from `lib/`), `stex.js` (`mode/stex`), `show-hint.js`, `show-hint.css` (`addon/hint`), `matchbrackets.js` (`addon/edit`), `active-line.js` (`addon/selection`) | MIT, `codemirror/LICENSE` |

To update one, run `npm pack <name>@<version>`, extract the archive and copy the same files.
