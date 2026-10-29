<div align=center>

<img src="icons/logo.png" alt="Bangai-O HD: Missile Fury" width="60%">

</div>
<h1 align=center>bangaio-nx installer</h1>

A web page that builds the Nintendo Switch package of **Bangai-O HD: Missile Fury** (Xbox Live Arcade, title `58410AF2`)
for [bangaio-nx](https://github.com/ChanseyIsTheBest/bangaio-nx) from the player's own copy, in the browser. Nothing is
uploaded: the game's files never leave the computer.

**Use it here: https://chanseyisthebest.github.io/bangaio-nx-installer/** (a Chromium browser: Chrome, Edge, ...)

The release NRO carries no game data: none of the game's files and none of its shaders. The page makes the shaders
from the player's files, as bangaio-nx's native build makes them:

1. **The shaders' containers** (`lib/bangaio_dump.js`): `default.xex` is decrypted and unpacked (`lib/xex.js`, with
   libmspack's LZX decoder in WebAssembly, `wasm/lzx.*`), and the containers compiled into it are found by reNut's
   `find_shader_headers` rules; the stand-alone ones are `media/shader/*.xvu` and `*.xpu`. 95 shaders (84 in the
   executable, 11 files), byte for byte bangaio-nx's native dump (Bangai-O makes none at runtime).
2. **Renut's translator** (`wasm/renut_hlsl`, XenosRecomp in WebAssembly): each container's HLSL and the numbers of the
   NRO's shader table (masks, vertex inputs, literals).
3. **GLSL for the console**, on a pool of workers (`glsl_worker.js`): `renut_early_alpha.py` (pixel shaders), DXC,
   SPIRV-Cross, `deko3d_glsl.py` and `deko3d_glsl_opt.py`, the Python tools unchanged in
   [Pyodide](https://pyodide.org).
4. **deko3d_glsl.bin** (`lib/package.js`, version 2 of the GLSL package, tag `renut7-bnxglsl1`): the GLSL and the shader
   table, which the NRO reads next to itself.
5. **deko3d_shaders.bin**: every shader variant of `release/variants.txt` (137, from bangaio-nx's
   `tools/deko3d_variant_cache.py --export-variants` over its pipeline list) plus each shader as it is, compiled by uam
   in WebAssembly (`wasm/uam`, the console's compiler with banjo-nx's flags), so the console compiles nothing at its
   first start.
6. **bangaio-nx.zip** (about 300 MB), streamed to a download by the service worker (`sw.js`): `switch/bangaio-nx/` with
   the NRO, `renut.toml` (the three settings), `pipeline_list.bin`, the two shader files and `game_root/` (the game's
   files).

The shaders the page makes give the console the same code as the native build's: the shader table's numbers are the
same for all 95, and all 137 variants compile to the same DKSH bytes (the GLSL texts differ only in how DXC numbers
its temporaries, a consistent renaming).

## What the player chooses

- **The game's package** (`Content/0000000000000000/58410AF2/000D0000/<package>` of a console's storage), read in place
  (`lib/stfs.js`); or
- **the extracted game folder** (`default.xex`, `media/`, `ArcadeInfo.xml`, ...).

Bangai-O HD has no title update. `default.xex` is recognised by its SHA-256 (`release/manifest.json`).

## Settings

`switch/bangaio-nx/renut.toml`: `docked_resolution` (900: drawn at 1600x900, shown at 1920x1080; or 1080), `smaa`
(true / false) and `language` ("english", "japanese", "french"). Making the package again writes a fresh `renut.toml`:
keep yours if you changed it.

## Use

Open https://chanseyisthebest.github.io/bangaio-nx-installer/ in a Chromium browser. To run it from a copy of this
repository instead:

    python serve.py 8193 .

then open http://127.0.0.1:8193/ in a Chromium browser (service-worker downloads, `webkitdirectory`, nested
workers).

## Release files

`release/` is filled by `tools/make_release.py` from a bangaio-nx **distribution build**: its own shader table empty
(bangaio-nx: `tools/renut_switch_shader_cache.py --pc app/out/pc-nx --only <an empty folder> --out-dir
app/out/renut_switch_dist`) and no GLSL package (`BANJO_DEKO3D_GLSL_CPP` pointing at no file), so it reads every
shader from `deko3d_glsl.bin`. With `--reference`, the manifest also holds the SHA-256 of the two shader files a Node
run made (`test/full_node.mjs`), so the page can say whether its own are identical.

## Tests (Node 24, from this folder)

| Test | What it checks |
|---|---|
| `test/full_node.mjs <game folder> <bangaio-nx> <out>` | the whole build as the page runs it, against bangaio-nx's native dump, shader table, GLSL and DKSH cache |
| `test/stfs_node.mjs <the game's package> <game folder>` | every file `lib/stfs.js` reads from the package, against the extracted folder |
| `test/browser.html` (with `python serve.py 8193 . --test-files <folder>`) | worker.js in a browser on the package (`?mode=package&file=<name>`) or the folder (`?mode=folder`): the zip read back, its files' SHA-256 against the manifest and the game files' CRC-32 |
| `test/chain_node.mjs`, `test/translate_node.mjs`, `test/py_passes_node.mjs`, `test/spirv_cross_node.mjs`, `test/uam_node.mjs` | banjo-nx-installer's checks of the chain's parts |

Outputs of the tests (shader files, zips) are game data: never commit or share them.

See NOTICES.md for what comes from where and its licences. GPL-3.0 (LICENSE).
