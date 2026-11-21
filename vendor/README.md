# Vendored libraries

These files are copied unmodified from the npm packages below, so the site works offline and on
GitHub Pages without a build step or CDN.

| Library | Version | Files | License |
| --- | --- | --- | --- |
| [MathJax](https://www.mathjax.org/) | 3.2.2 | `mathjax/tex-svg-full.js` (from `es5/`) | Apache-2.0, `mathjax/LICENSE` |
| [CodeMirror](https://codemirror.net/5/) | 5.65.18 | `codemirror/codemirror.js`, `codemirror.css` (from `lib/`), `stex.js` (`mode/stex`), `show-hint.js`, `show-hint.css` (`addon/hint`), `matchbrackets.js` (`addon/edit`), `active-line.js` (`addon/selection`) | MIT, `codemirror/LICENSE` |

To update one, run `npm pack <name>@<version>`, extract the archive and copy the same files.
