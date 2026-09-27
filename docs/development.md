# Local Dyalog development

## Installed on this Mac

Verified on 2026-09-27: native Apple Silicon Dyalog **20.0.53963.0**.

- Application: `/Applications/Dyalog-20.0.app`
- Terminal launcher: `/opt/homebrew/bin/dyalog`
- Script launchers: `/opt/homebrew/bin/dyalogscript` and `/opt/homebrew/bin/dyalogscript.bash`

The app came from the official macOS ARM package selected by Homebrew. Its package signature identified Dyalog Limited and passed Apple's notarization check; the extracted application passed `codesign --verify --deep --strict`.

Homebrew's package installer required an administrator password. The app bundle was instead copied intact to the already-writable `/Applications` directory, and launchers were linked into `/opt/homebrew/bin`. No administrator access or shell-profile changes were required. **This is a manual installation, not a Homebrew-managed cask**; use the official installer for future upgrades, or deliberately replace the manual installation with a Homebrew-managed one.

The interpreter reports `UNREGISTERED - not for commercial use`. See Dyalog's [download page](https://www.dyalog.com/download-zone.htm?p=download) and [licensing information](https://www.dyalog.com/prices-and-licences.htm) for registration and usage terms.

## Run the checked example

From the repository root:

```sh
./scripts/check-runtime.sh
```

This runs real Dyalog code and checks arithmetic, reshape/transpose, a 3×3 Stencil sum, and loading `bitmap.dyalog` as a class. A successful run prints:

```text
Dyalog version: 20.0.53963.0
PASS: arithmetic, reshape, transpose, Stencil, and Bitmap class loading
For image-processing and BMP checks: python3 tests/run.py
```

The smoke check is intentionally limited. Run `python3 tests/run.py` for the implemented blur and BMP suite, including 72 direct 2-D oracle comparisons and independent serialized-byte checks. It requires only Python 3's standard library in addition to Dyalog. See [the roadmap](../ROADMAP.md) for the next milestone.

The shell wrapper uses `dyalog -script` directly, with the embedded HTML renderer disabled. This preserves nonzero interpreter exit codes. The bundled `dyalogscript` launcher returned shell status zero on an APL failure during setup, so it is unsuitable as the test runner's success signal on this installation.

## Interactive use

Launch the graphical environment:

```sh
open -a Dyalog-20.0
```

Or start the terminal interpreter:

```sh
dyalog
```

Try these expressions (paste the glyphs to begin with):

```apl
⎕IO←1
+/⍳10                  ⍝ 55
image←3 4⍴⍳12
⍴image                 ⍝ 3 4
⍉image                 ⍝ Swap rows and columns
{+/,⍵}⌺3 3⊢3 3⍴⍳9     ⍝ Neighborhood sums with zero-filled edges
```

Exit the terminal interpreter with `)OFF`.

For this checkout, load the pure operations and adapter into the root namespace with:

```apl
⎕FIX 'file:///Users/tfogo/p/BitmapAPL/src/ImageOps.dyalog'
⎕FIX 'file:///Users/tfogo/p/BitmapAPL/bitmap.dyalog'
```

`⎕FIX` works in the minimal script environment used by the check. The original README's `⎕SE.SALT.Load` approach requires a session where SALT is initialized; it was not available in the minimal script process. Loading the class alone does not exercise its constructor; the full suite does.

For typing rather than pasting APL, see Dyalog's [fonts and keyboards](https://www.dyalog.com/apl-font-keyboard.htm). Keyboard configuration and graphical-editor behavior have not been tested here.

## Installing on another Mac

Use the [official Dyalog download](https://www.dyalog.com/download-zone.htm?p=download), or, with Homebrew:

```sh
brew install --cask dyalog
```

The standard package installation may request an administrator password. Prefer Dyalog for this project: the existing class syntax and native-file functions are dialect-specific, so GNU APL is not a drop-in replacement.
