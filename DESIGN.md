# Design

eqset is a compositor's bench for one equation at a time: white stock, steel-grey rules and one
green "registration ink". The rendered equation is the hero, and every other part of the tool
recedes around it. Product register, Restrained colour strategy.

**Scene:** a teacher at 7:40 am in a fluorescent-lit classroom, or a student at a library desk, on a
school laptop with a washed-out screen, pasting one equation into Google Slides before class. This
is why light is the default (bright rooms, low-contrast screens) and dark follows the system
setting for evening use.

## Rules

- **No rounded corners anywhere.** `border-radius` is only ever reset to 0, including native
  controls (selects, colour swatches and search fields use `appearance: none`).
- **No cards.** Regions are divided by 1px rules into one continuous desk. The symbol palette and
  template lists are type cases: compartments separated by hairlines.
- **Show the exact output.** The preview backdrop follows the ink colour, not the UI theme. Dimension
  lines and crop marks show the exported size, padding included.
- **Accent means action or state.** It's used for primary buttons, the selected category, focus, the
  caret, tab-stop slots and measurements. It's never decoration.

## Colour (OKLCH)

| Role | Light | Dark |
| --- | --- | --- |
| bg (stage frame, editor, inputs) | `oklch(1 0 0)` | `oklch(0.165 0 0)` |
| panel (bars, inspector, gutter) | `oklch(0.972 0.004 145)` | `oklch(0.205 0.004 145)` |
| ink | `oklch(0.22 0.012 145)` | `oklch(0.94 0.006 145)` |
| ink-2 (secondary text, ≥ 6:1) | `oklch(0.45 0.012 145)` | `oklch(0.74 0.012 145)` |
| rule / rule-strong | `0.9` / `0.78` L, hue 145 | `0.29` / `0.42` L |
| accent (registration green) | `oklch(0.47 0.12 145)` | `oklch(0.79 0.13 145)` |
| error | `oklch(0.5 0.17 28)` | `oklch(0.76 0.14 28)` |
| invert (selected segment, active hint, toast) | ink on bg, swapped | |

## Type

One family in two widths, both from the Atkinson Hyperlegible project (Braille Institute), chosen
for low-vision legibility: `l` / `1` / `I` and `0` / `O` are always distinct. The fonts are vendored
in `vendor/fonts` and need no network.

- **Atkinson Hyperlegible Next** (variable 200–800) for all UI.
- **Atkinson Hyperlegible Mono** for LaTeX source, file names and hex values.
- The scale uses a fixed rem ratio of about 1.15: 12 / 13 / 14 (base) / 15 (editor) / 18 (wordmark).
  Weight carries hierarchy: 500 labels, 600 buttons, 700 section names, 800 wordmark.

## Layout

Desktop is a full-height desk: the preview (hero) sits over the LaTeX editor, which sits over the
Insert tray (Symbols / Templates / Saved). A 320px Export inspector runs down the right, with
output actions pinned to its bottom. Below 900px everything stacks in task order: preview, editor,
export, insert. Short screens (≤ 780px tall) tighten the row minimums.

## Components

- **Buttons:** 34px, 1px rule border. Primary is filled accent. Quiet buttons have no border until
  hover. States: hover, active, focus ring (2px accent), disabled, busy ("Drawing…"), and copied
  (the label changes to "Copied").
- **Segmented control:** the selected segment is inverted (ink background), used for zoom and math
  style.
- **Tabs:** the Insert switch uses an ink underline. Symbol categories use an accent underline.
- **Caret:** a 3px accent bar that pulses between 100% and 40% opacity and never disappears.
- **Errors:** an overlay bar at the bottom of the preview (no layout shift), shown only after a 700 ms
  pause so half-typed commands don't flash a warning. Exports stop immediately.

## Motion

150–200 ms, ease-out-quart, and only for state: hover, selection, toast, popup and dialog entry, the
stale-preview fade and the caret pulse. `prefers-reduced-motion` removes all of it.
