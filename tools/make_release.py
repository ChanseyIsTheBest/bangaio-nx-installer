#!/usr/bin/env python3
"""bangaio-nx-installer: fills release/ from a bangaio-nx distribution build (nights-nx-installer's, from
banjo-nx-installer's).

    python tools/make_release.py --nro <distribution bangaio-nx.nro> --port <bangaio-nx root> --xex <default.xex>
        --pipelines <pipeline_list.bin> [--reference <folder of test/full_node.mjs's output>] [--version 1.0.0]

The NRO must be a distribution build (bangaio-nx: an empty shader table, tools/renut_switch_shader_cache.py --only on an
empty folder, and no GLSL package, BANJO_DEKO3D_GLSL_CPP pointing at no file: Bangai-O makes no shader at runtime): it
carries none of the game's shaders. release/ then holds the NRO, the files the zip carries beside it (renut.toml with
the three settings, the pipeline list, the four-core NPDM), the translator's shader_common.h, and manifest.json naming
each file's SHA-256 and the supported default.xex (its SHA-256 only). With --reference, the SHA-256 of the
deko3d_glsl.bin and deko3d_shaders.bin a run of the whole build made (they are the same bytes in every browser): the page
then says whether its own are identical. release/variants.txt is written by bangaio-nx's tools/deko3d_variant_cache.py
--export-variants.
"""
import argparse
import hashlib
import json
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NPDM = 'atmosphere/contents/05BA6A1000001000/exefs/main.npdm'


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--nro', required=True)
    ap.add_argument('--port', required=True)
    ap.add_argument('--xex', required=True)
    ap.add_argument('--pipelines', required=True)
    ap.add_argument('--reference')
    ap.add_argument('--version', default='1.0.0')
    a = ap.parse_args()
    release = os.path.join(ROOT, 'release')
    os.makedirs(release, exist_ok=True)
    # (source, name in release/, path in the zip from the SD card's root or None)
    copies = [(a.nro, 'bangaio-nx.nro', None),
              (a.pipelines, 'pipeline_list.bin', 'switch/bangaio-nx/pipeline_list.bin'),
              (os.path.join(a.port, 'dist', 'switch', 'bangaio-nx', 'renut.toml'), 'renut.toml',
               'switch/bangaio-nx/renut.toml'),
              (os.path.join(a.port, 'tools', 'forwarder', 'bangaio_main.npdm'), 'main.npdm', NPDM),
              (os.path.join(a.port, 'app', 'thirdparty', 'reblue-XenosRecomp', 'XenosRecomp', 'shader_common.h'),
               'shader_common.h', None)]
    for src, name, _ in copies:
        shutil.copyfile(src, os.path.join(release, name))
    build = {
        'edition': 'Xbox Live Arcade (title 58410AF2)',
        'version': a.version,
        'xex_sha256': sha256(a.xex),
        'nro': 'bangaio-nx.nro',
        'nro_sha256': sha256(os.path.join(release, 'bangaio-nx.nro')),
        'files': [{'path': path, 'source': name, 'sha256': sha256(os.path.join(release, name))}
                  for _, name, path in copies if path],
    }
    if a.reference:
        build['deko3d_glsl_sha256'] = sha256(os.path.join(a.reference, 'deko3d_glsl.bin'))
        build['deko3d_shaders_sha256'] = sha256(os.path.join(a.reference, 'deko3d_shaders.bin'))
    with open(os.path.join(release, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump({'version': 1, 'builds': [build]}, f, indent=2)
        f.write('\n')
    print(json.dumps(build, indent=2))


if __name__ == '__main__':
    main()
