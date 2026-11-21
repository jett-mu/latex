// MathJax configuration. Must load before vendor/mathjax/tex-svg-full.js.
window.MathJax = {
  startup: { typeset: false },
  options: { enableMenu: false },
  svg: {
    // Inline every glyph path in each SVG so exported files are self-contained
    // (no shared <defs>/<use> references across documents).
    fontCache: 'none',
  },
  tex: {
    // Throw parse errors instead of rendering red error text, and report undefined
    // commands as errors. `require` would try to download extensions, and `html`
    // allows \href{javascript:…} from shared links, so both are disabled.
    packages: { '[-]': ['noerrors', 'noundefined', 'require', 'html'] },
    formatError(jax, err) { throw err; },
    maxBuffer: 50 * 1024,
    maxMacros: 10000,
  },
};
