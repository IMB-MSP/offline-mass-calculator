# Offline Mass Calculator

Offline Mass Calculator is an offline calculator for neutral molecular formula masses, common positive and negative electrospray ions, theoretical isotope patterns, observed-mass matching, and batch exports. It runs locally in a browser and makes no network requests.

## Use the application

Open [`dist/offline-mass-calculator.html`](dist/offline-mass-calculator.html) directly in a current browser. No installation, server, account, or internet connection is needed. Enter a neutral formula and optionally a name, then calculate. Select an ion preset or customize the ions; switch between positive and negative mode as needed. Use **Paste batch** or **Import CSV** for a list, review the preview, then append or replace entries. Batch rows require both a name and formula. Export the summary, ion list, metadata JSON, invalid rows, or experimental Skyline target CSV from the results area.

Formula input accepts element symbols and positive integer counts, with nested parentheses (for example, `C6H12O6` or `Ca(OH)2`). Enter neutral formulas only: charge, isotope notation, dot hydrates, and bracketed adducts are not formula syntax. A formula is limited to 500 characters, nesting depth 12, and 10,000 atoms. Batch input is limited to 2 MiB and 2,000 compounds; each row has exactly two fields, name and formula. Names are optional for manual entries and default to the canonical formula.

Entries and settings live in memory. Refreshing or closing the page removes entries; **Clear all** also removes them. Export data before closing if you need to keep it. Metadata JSON records calculation settings, reference identifiers, and counts, but does not save or restore a session. Display rounding does not reduce the full numeric precision in exports.

## Scientific notes and limitations

Atomic masses and isotope abundances come from a frozen snapshot of NIST Atomic Weights and Isotopic Compositions. The `2026-11-05` date is the date the source data were retrieved; it is not a new NIST evaluation. Monoisotopic mass uses the most abundant isotope of each element. Average mass uses NIST standard atomic weights, with interval-valued weights represented by their midpoint. Isotope patterns use a bounded natural-abundance convolution; previews are limited to 600 ion atoms and computational budgets. Some element compositions have no usable isotope distribution.

This is a composition calculator, not a structure validator, identification tool, or prediction of experimental ion abundance. Adducts and neutral-loss entries represent possible compositions, not observed ions. Average masses are not sample-specific isotope-weighted values, and the monoisotopic composition need not produce the most abundant peak. Experimental resolution, isotope broadening, retention time, and instrument response are not modelled.

Skyline CSV export is experimental. It has not been verified by importing it into desktop Skyline. In Skyline, select the small-molecule interface and use **Edit → Insert → Transition List** (or the equivalent import in your version). Map the neutral formula, adduct, charge, and precursor m/z columns; import precursor-only targets and verify every target before use. UI labels can vary by Skyline version. Do not silently alter a formula if an adduct is rejected.

## Development and files

Node.js is needed only to run the build and tests. There are no third-party dependencies:

```sh
npm test
npm run build
```

The build writes the standalone file to `dist/offline-mass-calculator.html`. The `src/`, `data/`, `scripts/`, and `tests/` folders contain application source, frozen references, small reference-generation/check scripts, and regression tests. Keep these files, `index.html`, `styles.css`, `package.json`, `LICENSE`, `.gitignore`, this README, and the built HTML in the GitHub repository. People who only want to use the application need `offline-mass-calculator.html`, the user README, and `LICENSE` from the application download.

Offline Mass Calculator is provided under the MIT License; see [`LICENSE`](LICENSE).
