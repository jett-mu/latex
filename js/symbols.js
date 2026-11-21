// Symbol and snippet catalogue used by the palette and editor suggestions.
//
// Each entry: { cmd, snippet, cat, kw, preview?, env?, label? }
//   cmd      what is shown and matched (e.g. "\alpha", "\frac{}{}")
//   snippet  inserted text; #1..#9 are tab stops in order
//   kw       space-separated search keywords
//   preview  TeX used to draw the palette glyph (defaults to snippet with stops as boxes)
//   env      environment name, for \begin{…} completion
//   label    text shown instead of a glyph (used for invisible things like spaces)
//   alone    false when the snippet only makes sense inside something else (\hline)
//
// Every entry is rendered through MathJax by the browser test suite.

const R = String.raw;

export const CATEGORIES = [
  { id: 'structures', label: 'Structures' },
  { id: 'greek', label: 'Greek' },
  { id: 'operators', label: 'Operators' },
  { id: 'relations', label: 'Relations' },
  { id: 'arrows', label: 'Arrows' },
  { id: 'bigops', label: 'Sums & integrals' },
  { id: 'delimiters', label: 'Brackets' },
  { id: 'accents', label: 'Accents' },
  { id: 'functions', label: 'Functions' },
  { id: 'sets', label: 'Sets & logic' },
  { id: 'fonts', label: 'Fonts & color' },
  { id: 'environments', label: 'Matrices & environments' },
  { id: 'misc', label: 'Misc & spacing' },
  { id: 'chemistry', label: 'Chemistry' },
];

/** Plain symbols: one per line, "\cmd keyword keyword…". */
function table(cat, src) {
  return src.trim().split('\n').map((line) => {
    const [cmd, ...kw] = line.trim().split(/\s+/);
    return { cmd, snippet: cmd, cat, kw: kw.join(' ') };
  });
}

/** Structured entry. */
function S(cat, cmd, snippet, kw = '', extra = {}) {
  return { cmd, snippet, cat, kw, ...extra };
}

const greek = table('greek', R`
\alpha a
\beta b
\gamma g
\delta d
\epsilon e
\varepsilon e epsilon
\zeta z
\eta h
\theta q angle
\vartheta theta
\iota i
\kappa k
\varkappa kappa
\lambda l wavelength
\mu m micro
\nu n
\xi x
\pi p
\varpi pi
\rho r density
\varrho rho
\sigma s
\varsigma sigma final
\tau t
\upsilon u
\phi f
\varphi phi f
\chi c
\psi y
\omega w
\digamma f
\Gamma G
\Delta D change
\Theta Q
\Lambda L
\Xi X
\Pi P product
\Sigma S sum
\Upsilon U
\Phi F
\Psi Y
\Omega W ohm
\varGamma Gamma italic
\varDelta Delta italic
\varTheta Theta italic
\varLambda Lambda italic
\varXi Xi italic
\varPi Pi italic
\varSigma Sigma italic
\varUpsilon Upsilon italic
\varPhi Phi italic
\varPsi Psi italic
\varOmega Omega italic
\aleph hebrew cardinal
\beth hebrew
\gimel hebrew
\daleth hebrew
`);

const operators = table('operators', R`
\pm plus minus
\mp minus plus
\times multiply cross
\div divide
\cdot dot multiply
\ast asterisk star
\star
\circ compose ring
\bullet dot
\oplus circle plus xor direct sum
\ominus circle minus
\otimes tensor circle times
\oslash circle slash
\odot circle dot
\cap intersection
\cup union
\sqcap square cap
\sqcup square cup
\uplus multiset union
\wedge and
\vee or
\setminus difference minus backslash
\smallsetminus difference
\wr wreath
\diamond
\bigtriangleup triangle
\bigtriangledown triangle
\triangleleft
\triangleright
\lhd normal subgroup
\rhd
\unlhd
\unrhd
\dagger adjoint
\ddagger
\amalg coproduct
\bigcirc circle
\boxplus
\boxminus
\boxtimes
\boxdot
\dotplus
\ltimes semidirect
\rtimes semidirect
\leftthreetimes
\rightthreetimes
\curlywedge
\curlyvee
\barwedge nand
\veebar xor
\doublebarwedge
\divideontimes
\intercal transpose
\centerdot
\Cap
\Cup
\circledast
\circledcirc
\circleddash
`);

const relations = table('relations', R`
\leq less equal le
\geq greater equal ge
\neq not equal ne
\equiv identical congruent
\approx approximately
\sim similar tilde
\simeq similar equal
\cong congruent isomorphic
\propto proportional
\varpropto proportional
\ll much less
\gg much greater
\lll
\ggg
\prec precedes
\succ succeeds
\preceq
\succeq
\subset subset
\supset superset
\subseteq subset equal
\supseteq superset equal
\subsetneq proper subset
\supsetneq proper superset
\nsubseteq not subset
\nsupseteq not superset
\Subset
\Supset
\sqsubset
\sqsupset
\sqsubseteq
\sqsupseteq
\in element member
\ni contains
\notin not element
\mid divides bar such that
\nmid not divides
\parallel parallel
\nparallel not parallel
\perp perpendicular orthogonal
\models satisfies
\vdash proves turnstile
\dashv
\vDash
\Vdash
\asymp
\doteq
\bowtie join
\smile
\frown
\leqslant less equal
\geqslant greater equal
\lesssim less similar
\gtrsim greater similar
\lessgtr
\gtrless
\lessapprox
\gtrapprox
\approxeq
\backsim
\backsimeq
\triangleq defined equal
\coloneqq defined colon equals
\eqqcolon
\nleq not less equal
\ngeq not greater equal
\nless not less
\ngtr not greater
\lneq
\gneq
\lneqq
\gneqq
\nsim not similar
\ncong not congruent
\trianglelefteq normal subgroup
\trianglerighteq
\vartriangleleft
\vartriangleright
\risingdotseq
\fallingdotseq
\eqcirc
\circeq
\bumpeq
\Bumpeq
\pitchfork
\between
\shortmid
\shortparallel
`);

const arrows = table('arrows', R`
\to right maps tends
\rightarrow right
\leftarrow left
\gets left assign
\leftrightarrow both
\Rightarrow implies
\Leftarrow
\Leftrightarrow iff equivalent
\longrightarrow long right
\longleftarrow long left
\longleftrightarrow long both
\Longrightarrow long implies
\Longleftarrow
\Longleftrightarrow
\implies
\impliedby
\iff if and only if
\mapsto maps to
\longmapsto maps to
\hookrightarrow injection inclusion
\hookleftarrow
\twoheadrightarrow surjection onto
\twoheadleftarrow
\rightarrowtail injection
\leftarrowtail
\uparrow up
\downarrow down
\updownarrow
\Uparrow
\Downarrow
\Updownarrow
\nearrow northeast
\searrow southeast
\swarrow southwest
\nwarrow northwest
\rightharpoonup harpoon vector
\rightharpoondown harpoon
\leftharpoonup harpoon
\leftharpoondown harpoon
\rightleftharpoons equilibrium reversible
\leftrightharpoons equilibrium
\upharpoonright restriction
\upharpoonleft
\downharpoonright
\downharpoonleft
\rightrightarrows
\leftleftarrows
\rightleftarrows
\leftrightarrows
\looparrowright
\looparrowleft
\curvearrowright
\curvearrowleft
\circlearrowright clockwise
\circlearrowleft anticlockwise
\Rsh
\Lsh
\multimap lollipop
\rightsquigarrow squiggle
\leftrightsquigarrow
\leadsto
\nrightarrow not
\nleftarrow not
\nRightarrow not implies
\nLeftarrow not
\nleftrightarrow not
\nLeftrightarrow not iff
`).concat([
  S('arrows', R`\xrightarrow{}`, R`\xrightarrow{#1}`, 'extensible arrow label over'),
  S('arrows', R`\xleftarrow{}`, R`\xleftarrow{#1}`, 'extensible arrow label over'),
  S('arrows', R`\xrightarrow[]{}`, R`\xrightarrow[#1]{#2}`, 'extensible arrow label under over'),
  S('arrows', R`\xLeftrightarrow{}`, R`\xLeftrightarrow{#1}`, 'extensible arrow label iff'),
  S('arrows', R`\xrightleftharpoons{}`, R`\xrightleftharpoons{#1}`, 'extensible equilibrium label'),
  S('arrows', R`\xmapsto{}`, R`\xmapsto{#1}`, 'extensible maps to label'),
]);

const bigops = table('bigops', R`
\sum sum sigma series
\prod product pi
\coprod coproduct
\int integral
\iint double integral
\iiint triple integral
\iiiint quadruple integral
\oint contour line integral
\bigcup union
\bigcap intersection
\bigsqcup
\bigvee or
\bigwedge and
\bigoplus direct sum
\bigotimes tensor
\bigodot
\biguplus
`).concat([
  S('bigops', R`\sum_{i=1}^{n}`, R`\sum_{#1}^{#2}`, 'sum limits series sigma'),
  S('bigops', R`\prod_{i=1}^{n}`, R`\prod_{#1}^{#2}`, 'product limits'),
  S('bigops', R`\int_{a}^{b}`, R`\int_{#1}^{#2}`, 'integral definite limits bounds'),
  S('bigops', R`\int_{a}^{b} f\,dx`, R`\int_{#1}^{#2} #3 \,\mathrm{d}{#4}`, 'integral definite dx differential'),
  S('bigops', R`\int f\,dx`, R`\int #1 \,\mathrm{d}{#2}`, 'integral indefinite antiderivative dx'),
  S('bigops', R`\iint_{D}`, R`\iint_{#1}`, 'double integral region'),
  S('bigops', R`\oint_{C}`, R`\oint_{#1}`, 'contour integral closed curve'),
  S('bigops', R`\lim_{x \to a}`, R`\lim_{#1 \to #2}`, 'limit tends'),
  S('bigops', R`\bigcup_{i=1}^{n}`, R`\bigcup_{#1}^{#2}`, 'union indexed'),
  S('bigops', R`\bigcap_{i=1}^{n}`, R`\bigcap_{#1}^{#2}`, 'intersection indexed'),
  S('bigops', R`\sum\limits_{}^{}`, R`\sum\limits_{#1}^{#2}`, 'sum limits above below inline'),
  S('bigops', R`\int\limits_{}^{}`, R`\int\limits_{#1}^{#2}`, 'integral limits above below'),
]);

const delimiters = table('delimiters', R`
\langle angle bracket left
\rangle angle bracket right
\lfloor floor left
\rfloor floor right
\lceil ceiling left
\rceil ceiling right
\lvert absolute bar left
\rvert absolute bar right
\lVert norm double bar left
\rVert norm double bar right
\vert bar
\Vert double bar norm
\{ brace curly left set
\} brace curly right set
\backslash
\ulcorner corner
\urcorner corner
\llcorner corner
\lrcorner corner
`).concat([
  S('delimiters', R`\left( \right)`, R`\left( #1 \right)`, 'parentheses auto size big brackets round'),
  S('delimiters', R`\left[ \right]`, R`\left[ #1 \right]`, 'square brackets auto size big'),
  S('delimiters', R`\left\{ \right\}`, R`\left\{ #1 \right\}`, 'braces curly auto size big set'),
  S('delimiters', R`\left| \right|`, R`\left| #1 \right|`, 'absolute value auto size abs'),
  S('delimiters', R`\left\| \right\|`, R`\left\| #1 \right\|`, 'norm auto size'),
  S('delimiters', R`\left\langle \right\rangle`, R`\left\langle #1 \right\rangle`, 'angle brackets inner product expectation'),
  S('delimiters', R`\left\lfloor \right\rfloor`, R`\left\lfloor #1 \right\rfloor`, 'floor auto size'),
  S('delimiters', R`\left\lceil \right\rceil`, R`\left\lceil #1 \right\rceil`, 'ceiling auto size'),
  S('delimiters', R`\left. \right|`, R`\left. #1 \right|_{#2}`, 'evaluated at bar substitution'),
  S('delimiters', R`\left( \middle| \right)`, R`\left( #1 \middle| #2 \right)`, 'conditional given middle bar'),
  S('delimiters', R`\bigl( \bigr)`, R`\bigl( #1 \bigr)`, 'big parentheses manual size'),
  S('delimiters', R`\Bigl( \Bigr)`, R`\Bigl( #1 \Bigr)`, 'big parentheses manual size'),
  S('delimiters', R`\biggl( \biggr)`, R`\biggl( #1 \biggr)`, 'bigger parentheses manual size'),
  S('delimiters', R`\Biggl( \Biggr)`, R`\Biggl( #1 \Biggr)`, 'biggest parentheses manual size'),
]);

const accents = [
  S('accents', R`\hat{}`, R`\hat{#1}`, 'hat circumflex unit vector estimate'),
  S('accents', R`\widehat{}`, R`\widehat{#1}`, 'wide hat fourier'),
  S('accents', R`\bar{}`, R`\bar{#1}`, 'bar mean average'),
  S('accents', R`\overline{}`, R`\overline{#1}`, 'overline bar conjugate closure'),
  S('accents', R`\underline{}`, R`\underline{#1}`, 'underline'),
  S('accents', R`\tilde{}`, R`\tilde{#1}`, 'tilde'),
  S('accents', R`\widetilde{}`, R`\widetilde{#1}`, 'wide tilde'),
  S('accents', R`\vec{}`, R`\vec{#1}`, 'vector arrow'),
  S('accents', R`\overrightarrow{}`, R`\overrightarrow{#1}`, 'vector arrow long'),
  S('accents', R`\overleftarrow{}`, R`\overleftarrow{#1}`, 'arrow over left'),
  S('accents', R`\overleftrightarrow{}`, R`\overleftrightarrow{#1}`, 'arrow over both line'),
  S('accents', R`\underrightarrow{}`, R`\underrightarrow{#1}`, 'arrow under'),
  S('accents', R`\underleftarrow{}`, R`\underleftarrow{#1}`, 'arrow under'),
  S('accents', R`\dot{}`, R`\dot{#1}`, 'dot derivative time'),
  S('accents', R`\ddot{}`, R`\ddot{#1}`, 'double dot second derivative'),
  S('accents', R`\dddot{}`, R`\dddot{#1}`, 'triple dot'),
  S('accents', R`\acute{}`, R`\acute{#1}`, 'acute'),
  S('accents', R`\grave{}`, R`\grave{#1}`, 'grave'),
  S('accents', R`\breve{}`, R`\breve{#1}`, 'breve'),
  S('accents', R`\check{}`, R`\check{#1}`, 'check caron hacek'),
  S('accents', R`\mathring{}`, R`\mathring{#1}`, 'ring angstrom'),
  S('accents', R`\overbrace{}^{}`, R`\overbrace{#1}^{#2}`, 'brace over label'),
  S('accents', R`\underbrace{}_{}`, R`\underbrace{#1}_{#2}`, 'brace under label'),
  S('accents', R`\overset{}{}`, R`\overset{#1}{#2}`, 'over set stack above'),
  S('accents', R`\underset{}{}`, R`\underset{#1}{#2}`, 'under set stack below'),
  S('accents', R`\stackrel{}{}`, R`\stackrel{#1}{#2}`, 'stack relation above'),
  S('accents', R`\cancel{}`, R`\cancel{#1}`, 'cancel strike slash cross out'),
  S('accents', R`\bcancel{}`, R`\bcancel{#1}`, 'cancel backslash strike'),
  S('accents', R`\xcancel{}`, R`\xcancel{#1}`, 'cancel cross strike'),
  S('accents', R`\cancelto{}{}`, R`\cancelto{#1}{#2}`, 'cancel to value limit'),
  S('accents', R`\boxed{}`, R`\boxed{#1}`, 'box frame answer'),
];

const functions = table('functions', R`
\sin sine trig
\cos cosine trig
\tan tangent trig
\cot cotangent trig
\sec secant trig
\csc cosecant trig
\arcsin inverse sine
\arccos inverse cosine
\arctan inverse tangent
\sinh hyperbolic sine
\cosh hyperbolic cosine
\tanh hyperbolic tangent
\coth hyperbolic cotangent
\exp exponential
\log logarithm
\ln natural logarithm
\lg logarithm base
\lim limit
\liminf limit inferior
\limsup limit superior
\max maximum
\min minimum
\sup supremum
\inf infimum
\det determinant
\dim dimension
\ker kernel
\deg degree
\arg argument
\gcd greatest common divisor
\hom homomorphism
\Pr probability
\bmod modulo
`).concat([
  S('functions', R`\log_{}`, R`\log_{#1}`, 'logarithm base'),
  S('functions', R`\pmod{}`, R`\pmod{#1}`, 'modulo congruence parentheses'),
  S('functions', R`\operatorname{}`, R`\operatorname{#1}`, 'operator name custom function', { preview: R`\operatorname{tr}` }),
  S('functions', R`\operatorname*{}_{}`, R`\operatorname*{#1}_{#2}`, 'operator limits argmax argmin', { preview: R`\operatorname*{arg\,max}_{x}` }),
  S('functions', R`\sin^{2}`, R`\sin^{#1}`, 'sine squared power'),
  S('functions', R`f(x)`, R`#1(#2)`, 'function application call', { preview: R`f(x)` }),
  S('functions', R`f\colon A \to B`, R`#1\colon #2 \to #3`, 'function map signature domain codomain', { preview: R`f\colon A \to B` }),
]);

const structures = [
  S('structures', R`\frac{}{}`, R`\frac{#1}{#2}`, 'fraction divide numerator denominator over'),
  S('structures', R`\dfrac{}{}`, R`\dfrac{#1}{#2}`, 'fraction display large'),
  S('structures', R`\tfrac{}{}`, R`\tfrac{#1}{#2}`, 'fraction text small'),
  S('structures', R`\cfrac{}{}`, R`\cfrac{#1}{#2}`, 'continued fraction'),
  S('structures', R`{}/{}`, R`{#1}/{#2}`, 'slash fraction inline', { preview: R`a/b` }),
  S('structures', R`\sqrt{}`, R`\sqrt{#1}`, 'square root radical'),
  S('structures', R`\sqrt[n]{}`, R`\sqrt[#1]{#2}`, 'nth root cube root radical'),
  S('structures', R`^{}`, R`^{#1}`, 'superscript power exponent', { preview: R`x^{\square}` }),
  S('structures', R`_{}`, R`_{#1}`, 'subscript index', { preview: R`x_{\square}` }),
  S('structures', R`_{}^{}`, R`_{#1}^{#2}`, 'subscript superscript both', { preview: R`x_{\square}^{\square}` }),
  S('structures', R`{}^{}_{}`, R`{}^{#1}_{#2}`, 'prescript isotope left index', { preview: R`{}^{\square}_{\square}X` }),
  S('structures', R`e^{}`, R`e^{#1}`, 'exponential power e'),
  S('structures', R`\binom{}{}`, R`\binom{#1}{#2}`, 'binomial choose combination'),
  S('structures', R`\dbinom{}{}`, R`\dbinom{#1}{#2}`, 'binomial display'),
  S('structures', R`\tbinom{}{}`, R`\tbinom{#1}{#2}`, 'binomial text small'),
  S('structures', R`\frac{d}{dx}`, R`\frac{\mathrm{d} #1}{\mathrm{d} #2}`, 'derivative differential leibniz dy dx'),
  S('structures', R`\frac{d^2}{dx^2}`, R`\frac{\mathrm{d}^{2} #1}{\mathrm{d} #2^{2}}`, 'second derivative'),
  S('structures', R`\frac{\partial}{\partial x}`, R`\frac{\partial #1}{\partial #2}`, 'partial derivative'),
  S('structures', R`\frac{\partial^2}{\partial x^2}`, R`\frac{\partial^{2} #1}{\partial #2^{2}}`, 'second partial derivative'),
  S('structures', R`\frac{\partial^2}{\partial x \partial y}`, R`\frac{\partial^{2} #1}{\partial #2 \, \partial #3}`, 'mixed partial derivative'),
  S('structures', R`\text{}`, R`\text{#1}`, 'text words roman', { preview: R`\text{abc}` }),
  S('structures', R`\substack{}`, R`\substack{#1 \\ #2}`, 'substack multiline subscript', { preview: R`\sum_{\substack{i<n \\ j<m}}` }),
  S('structures', R`\phantom{}`, R`\phantom{#1}`, 'phantom invisible space', { label: 'phantom' }),
  S('structures', R`\{ x \mid \}`, R`\{ #1 \mid #2 \}`, 'set builder notation such that'),
  S('structures', R`|x|`, R`\lvert #1 \rvert`, 'absolute value abs modulus', { preview: R`\lvert x \rvert` }),
  S('structures', R`\|x\|`, R`\lVert #1 \rVert`, 'norm magnitude', { preview: R`\lVert x \rVert` }),
  S('structures', R`\langle x, y \rangle`, R`\langle #1, #2 \rangle`, 'inner product angle brackets'),
  S('structures', R`\tag{}`, R`\tag{#1}`, 'equation number tag label', { preview: R`x \tag{1}`, label: 'tag (1)' }),
];

const sets = table('sets', R`
\forall for all universal
\exists exists existential
\nexists not exists
\neg not negation
\lnot not negation
\land and conjunction
\lor or disjunction
\emptyset empty set
\varnothing empty set
\infty infinity
\complement complement
\top true top
\bot false bottom perpendicular
\therefore therefore
\because because
`).concat([
  S('sets', R`\mathbb{N}`, R`\mathbb{N}`, 'natural numbers'),
  S('sets', R`\mathbb{Z}`, R`\mathbb{Z}`, 'integers'),
  S('sets', R`\mathbb{Q}`, R`\mathbb{Q}`, 'rationals'),
  S('sets', R`\mathbb{R}`, R`\mathbb{R}`, 'reals real numbers'),
  S('sets', R`\mathbb{C}`, R`\mathbb{C}`, 'complex numbers'),
  S('sets', R`\mathbb{R}^{n}`, R`\mathbb{R}^{#1}`, 'euclidean space reals power'),
]);

const fonts = [
  S('fonts', R`\mathbb{}`, R`\mathbb{#1}`, 'blackboard bold double struck sets', { preview: R`\mathbb{R}` }),
  S('fonts', R`\mathcal{}`, R`\mathcal{#1}`, 'calligraphic script', { preview: R`\mathcal{L}` }),
  S('fonts', R`\mathscr{}`, R`\mathscr{#1}`, 'script fancy', { preview: R`\mathscr{F}` }),
  S('fonts', R`\mathfrak{}`, R`\mathfrak{#1}`, 'fraktur gothic lie algebra', { preview: R`\mathfrak{g}` }),
  S('fonts', R`\mathrm{}`, R`\mathrm{#1}`, 'roman upright', { preview: R`\mathrm{d}x` }),
  S('fonts', R`\mathbf{}`, R`\mathbf{#1}`, 'bold vector matrix', { preview: R`\mathbf{v}` }),
  S('fonts', R`\boldsymbol{}`, R`\boldsymbol{#1}`, 'bold italic greek symbol', { preview: R`\boldsymbol{\alpha}` }),
  S('fonts', R`\mathit{}`, R`\mathit{#1}`, 'italic', { preview: R`\mathit{abc}` }),
  S('fonts', R`\mathsf{}`, R`\mathsf{#1}`, 'sans serif', { preview: R`\mathsf{A}` }),
  S('fonts', R`\mathtt{}`, R`\mathtt{#1}`, 'typewriter monospace', { preview: R`\mathtt{x}` }),
  S('fonts', R`\textbf{}`, R`\textbf{#1}`, 'bold text', { preview: R`\textbf{bold}` }),
  S('fonts', R`\textit{}`, R`\textit{#1}`, 'italic text', { preview: R`\textit{italic}` }),
  S('fonts', R`\textcolor{}{}`, R`\textcolor{#1}{#2}`, 'color colour red blue highlight', { preview: R`\textcolor{red}{x}` }),
  S('fonts', R`\color{}`, R`\color{#1}`, 'color colour switch rest', { preview: R`\color{blue}{x}` }),
  S('fonts', R`\colorbox{}{}`, R`\colorbox{#1}{$#2$}`, 'background highlight box color', { preview: R`\colorbox{yellow}{$x$}` }),
  S('fonts', R`\fcolorbox{}{}{}`, R`\fcolorbox{#1}{#2}{$#3$}`, 'framed colored box border', { preview: R`\fcolorbox{red}{white}{$x$}` }),
  S('fonts', R`\displaystyle`, R`\displaystyle`, 'display style large', { preview: R`\displaystyle\sum` }),
  S('fonts', R`\textstyle`, R`\textstyle`, 'text style inline small', { preview: R`\textstyle\sum` }),
  S('fonts', R`\scriptstyle`, R`\scriptstyle`, 'script style smaller', { preview: R`\scriptstyle x` }),
  S('fonts', R`\large`, R`{\large #1}`, 'bigger size', { preview: R`{\large x}` }),
  S('fonts', R`\small`, R`{\small #1}`, 'smaller size', { preview: R`{\small x}` }),
];

function env(name, body, kw, extra = {}) {
  return S('environments', R`\begin{` + name + '}', R`\begin{` + name + '}' + body + R`\end{` + name + '}', kw, { env: name, ...extra });
}
const M2 = '\n  #1 & #2 \\\\\n  #3 & #4\n';
const environments = [
  env('matrix', M2, 'matrix no brackets grid'),
  env('pmatrix', M2, 'matrix parentheses round'),
  env('bmatrix', M2, 'matrix square brackets'),
  env('Bmatrix', M2, 'matrix curly braces'),
  env('vmatrix', M2, 'determinant matrix bars'),
  env('Vmatrix', M2, 'norm matrix double bars'),
  env('smallmatrix', M2, 'small inline matrix'),
  env('pmatrix', '\n  #1 & #2 & #3 \\\\\n  #4 & #5 & #6 \\\\\n  #7 & #8 & #9\n', 'matrix 3x3 three', { cmd: R`\begin{pmatrix} 3×3` }),
  env('cases', '\n  #1 & \\text{if } #2 \\\\\n  #3 & \\text{otherwise}\n', 'piecewise cases function conditions'),
  env('dcases', '\n  #1 & \\text{if } #2 \\\\\n  #3 & \\text{otherwise}\n', 'piecewise display cases'),
  env('rcases', '\n  #1 \\\\\n  #2\n', 'right brace cases'),
  env('aligned', '\n  #1 &= #2 \\\\\n  &= #3\n', 'align equations aligned steps'),
  env('align*', '\n  #1 &= #2 \\\\\n  #3 &= #4\n', 'align equations unnumbered'),
  env('gathered', '\n  #1 \\\\\n  #2\n', 'gather centered lines'),
  env('gather*', '\n  #1 \\\\\n  #2\n', 'gather centered lines unnumbered'),
  env('split', '\n  #1 &= #2 \\\\\n  &= #3\n', 'split long equation'),
  env('multline*', '\n  #1 \\\\\n  #2\n', 'multline long equation'),
  env('alignedat', '{2}\n  #1 &= #2 & \\quad #3 \\\\\n  #4 &= #5 & \\quad #6\n', 'aligned columns'),
  env('array', '{cc}\n  #1 & #2 \\\\\n  #3 & #4\n', 'array table columns'),
  env('array', '{c|c}\n  #1 & #2 \\\\\n  \\hline\n  #3 & #4\n', 'table lines hline', { cmd: R`\begin{array}{c|c} lines` }),
  env('CD', '\n  #1 @>{#2}>> #3 \\\\\n  @VVV @VVV \\\\\n  #4 @>>> #5\n', 'commutative diagram arrows category'),
  env('subarray', '{l}\n  #1 \\\\\n  #2\n', 'subarray subscript lines', { preview: R`\sum_{\begin{subarray}{l} i<n \\ j<m \end{subarray}}` }),
];

const misc = table('misc', R`
\partial partial derivative
\nabla gradient del nabla
\hbar planck reduced
\hslash planck
\ell script l length
\imath dotless i
\jmath dotless j
\Re real part
\Im imaginary part
\wp weierstrass
\prime prime derivative
\backprime
\angle angle
\measuredangle angle
\sphericalangle angle
\triangle triangle
\square square box
\blacksquare qed end proof
\Box box
\Diamond diamond
\lozenge diamond
\blacklozenge
\bigstar star
\clubsuit card
\diamondsuit card
\heartsuit card heart
\spadesuit card
\flat music
\natural music
\sharp music
\checkmark tick check
\maltese cross
\circledR registered
\yen currency
\mho conductance
\eth
\Finv
\Game
\surd root
\degree degrees angle temperature
\ldots dots ellipsis low
\cdots dots ellipsis center
\vdots dots vertical
\ddots dots diagonal
\dots dots ellipsis
\% percent
\# hash number
\& ampersand
\$ dollar
\_ underscore
`).concat([
  S('misc', R`^{\circ}`, R`^{\circ}`, 'degrees angle temperature', { preview: R`90^{\circ}` }),
  S('misc', R`'`, R`'`, 'prime derivative apostrophe', { preview: R`f'` }),
  S('misc', R`\,`, R`\,`, 'thin space small', { label: 'thin space', preview: R`a\,b` }),
  S('misc', R`\:`, R`\:`, 'medium space', { label: 'medium space', preview: R`a\:b` }),
  S('misc', R`\;`, R`\;`, 'thick space', { label: 'thick space', preview: R`a\;b` }),
  S('misc', R`\!`, R`\!`, 'negative thin space', { label: 'negative space', preview: R`a\!b` }),
  S('misc', R`\quad`, R`\quad`, 'quad space em', { label: 'quad', preview: R`a\quad b` }),
  S('misc', R`\qquad`, R`\qquad`, 'double quad space', { label: 'qquad', preview: R`a\qquad b` }),
  S('misc', R`\hspace{}`, R`\hspace{#1em}`, 'horizontal space custom length', { label: 'hspace', preview: R`a\hspace{1em}b`, alone: false }),
  S('misc', R`\\`, R`\\`, 'new line break row', { label: 'line break', preview: R`\begin{gathered}a\\b\end{gathered}` }),
  S('misc', R`\hline`, R`\hline`, 'horizontal line table rule', { label: 'hline', preview: R`\begin{array}{c}a\\\hline b\end{array}`, alone: false }),
  S('misc', R`\newcommand{}{}`, R`\newcommand{#1}{#2}`, 'define macro command', { label: 'newcommand', preview: R`\newcommand{\R}{\mathbb{R}}\R` }),
]);

const chemistry = [
  S('chemistry', R`\ce{}`, R`\ce{#1}`, 'chemistry formula mhchem molecule', { preview: R`\ce{H2O}` }),
  S('chemistry', R`\ce{A -> B}`, R`\ce{#1 -> #2}`, 'reaction arrow yields', { preview: R`\ce{A -> B}` }),
  S('chemistry', R`\ce{A <=> B}`, R`\ce{#1 <=> #2}`, 'equilibrium reversible reaction', { preview: R`\ce{A <=> B}` }),
  S('chemistry', R`\ce{A ->[cat] B}`, R`\ce{#1 ->[#2] #3}`, 'reaction catalyst over arrow', { preview: R`\ce{A ->[\Delta] B}` }),
  S('chemistry', R`\ce{^{A}_{Z}X}`, R`\ce{^{#1}_{#2}#3}`, 'isotope nuclide mass atomic number', { preview: R`\ce{^{14}_{6}C}` }),
  S('chemistry', R`\ce{X^{2+}}`, R`\ce{#1^{#2}}`, 'ion charge', { preview: R`\ce{SO4^{2-}}` }),
  S('chemistry', R`\ce{(aq)}`, R`\ce{(aq)}`, 'aqueous state', { preview: R`\ce{NaCl(aq)}` }),
  S('chemistry', R`\ce{v}`, R`\ce{v}`, 'precipitate down arrow', { preview: R`\ce{AgCl v}` }),
  S('chemistry', R`\ce{^}`, R`\ce{^}`, 'gas evolved up arrow', { preview: R`\ce{CO2 ^}` }),
  S('chemistry', R`\pu{}`, R`\pu{#1}`, 'physical units quantity', { preview: R`\pu{123 kJ/mol}` }),
];

export const SYMBOLS = [
  ...structures, ...greek, ...operators, ...relations, ...arrows, ...bigops,
  ...delimiters, ...accents, ...functions, ...sets, ...fonts, ...environments, ...misc, ...chemistry,
];

// Frequently used commands rank higher when several match equally well.
const POPULAR = R`\frac{}{} \sqrt{} \sum \int \alpha \beta \gamma \delta \theta \lambda \mu \pi \sigma \phi \omega
\Delta \infty \partial \nabla \times \cdot \pm \leq \geq \neq \approx \equiv \to \rightarrow \Rightarrow
\in \subset \cup \cap \forall \exists \mathbb{} \mathrm{} \text{} \lim \log \ln \sin \cos
\hat{} \vec{} \bar{} \dot{} \begin{pmatrix} \begin{bmatrix} \begin{cases} \begin{aligned} \quad
\epsilon \varepsilon \rho \tau \psi \Omega \ldots \cdots \prod \binom{}{} \mathbf{} \overline{} \sim \propto
\langle \rangle \ell \hbar \mapsto \iff \implies`
  .split(/\s+/).filter(Boolean)
  .concat([R`\left( \right)`, R`\sum_{i=1}^{n}`, R`\int_{a}^{b}`, R`\frac{d}{dx}`, R`\frac{\partial}{\partial x}`, R`\lim_{x \to a}`]);
const POP_RANK = new Map(POPULAR.map((c, i) => [c, POPULAR.length - i]));
for (const s of SYMBOLS) s.pop = POP_RANK.get(s.cmd) || 0;

/** TeX used to draw an entry's glyph. */
export function previewTex(entry) {
  if (entry.preview) return entry.preview;
  return entry.snippet.replace(/#[1-9]/g, R`\square`);
}

export const TEMPLATES = [
  { name: 'Quadratic formula', tex: R`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}` },
  { name: "Euler's identity", tex: R`e^{i\pi} + 1 = 0` },
  { name: 'Gaussian integral', tex: R`\int_{-\infty}^{\infty} e^{-x^2} \, \mathrm{d}x = \sqrt{\pi}` },
  { name: 'Taylor series', tex: R`f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!} (x - a)^n` },
  { name: 'Normal distribution', tex: R`f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\left( -\frac{(x-\mu)^2}{2\sigma^2} \right)` },
  { name: 'Bayes’ theorem', tex: R`P(A \mid B) = \frac{P(B \mid A)\, P(A)}{P(B)}` },
  { name: 'Definition of the derivative', tex: R`f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}` },
  { name: 'Fundamental theorem of calculus', tex: R`\int_{a}^{b} f'(x) \, \mathrm{d}x = f(b) - f(a)` },
  { name: 'Maxwell’s equations', tex: R`\begin{aligned}
  \nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
  \nabla \cdot \mathbf{B} &= 0 \\
  \nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
  \nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}` },
  { name: 'Schrödinger equation', tex: R`i\hbar \frac{\partial}{\partial t} \Psi(\mathbf{r}, t) = \left( -\frac{\hbar^2}{2m} \nabla^2 + V(\mathbf{r}, t) \right) \Psi(\mathbf{r}, t)` },
  { name: 'Matrix', tex: R`A = \begin{pmatrix}
  a_{11} & a_{12} & \cdots & a_{1n} \\
  a_{21} & a_{22} & \cdots & a_{2n} \\
  \vdots & \vdots & \ddots & \vdots \\
  a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}` },
  { name: 'Piecewise function', tex: R`|x| = \begin{cases}
  x & \text{if } x \geq 0 \\
  -x & \text{if } x < 0
\end{cases}` },
  { name: 'Fourier transform', tex: R`\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\, e^{-2\pi i x \xi} \, \mathrm{d}x` },
  { name: 'Binomial theorem', tex: R`(x + y)^n = \sum_{k=0}^{n} \binom{n}{k} x^{n-k} y^k` },
  { name: 'Cauchy–Schwarz inequality', tex: R`\left| \langle \mathbf{u}, \mathbf{v} \rangle \right|^2 \leq \langle \mathbf{u}, \mathbf{u} \rangle \cdot \langle \mathbf{v}, \mathbf{v} \rangle` },
  { name: 'Combustion of methane', tex: R`\ce{CH4 + 2 O2 -> CO2 + 2 H2O}` },
];
