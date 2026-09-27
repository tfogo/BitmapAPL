#!/usr/bin/env python3
"""Generate independent fixtures, run Dyalog, and verify serialized BMP bytes."""
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import sys

ROOT = Path(__file__).resolve().parents[1]


def bmp(width, height, pixels, top_down=False):
    rows = [bytes(pixels[y * width * 4:(y + 1) * width * 4]) for y in range(height)]
    data = b''.join(rows if top_down else reversed(rows))
    return (struct.pack('<2sIHHI', b'BM', 54 + len(data), 0, 0, 54)
            + struct.pack('<IiiHHIIiiII', 40, width, -height if top_down else height,
                          1, 32, 0, len(data), 2835, 2835, 0, 0) + data)


def sample(plane, y, x, mode):
    height, width = len(plane), len(plane[0])
    if mode == 'zero' and not (0 <= y < height and 0 <= x < width):
        return 0
    if mode == 'reflect':
        # Deliberately use repeated reflection rather than the APL modulo mapping.
        while not 0 <= y < height:
            y = -y - 1 if y < 0 else 2 * height - y - 1
        while not 0 <= x < width:
            x = -x - 1 if x < 0 else 2 * width - x - 1
    return plane[max(0, min(height - 1, y))][max(0, min(width - 1, x))]


def reference(plane, radius, sigma, mode):
    kernel = [math.exp(-0.5 * (i / sigma)**2) for i in range(-radius, radius + 1)]
    total = sum(kernel)
    kernel = [v / total for v in kernel]
    # Direct square-kernel oracle, independent of the two-pass Dyalog implementation.
    return [sum(kernel[j] * kernel[i] * sample(plane, y + j - radius, x + i - radius, mode)
                for j in range(len(kernel)) for i in range(len(kernel)))
            for y in range(len(plane)) for x in range(len(plane[0]))]


def correlate(plane, kernel, mode):
    rh, rw = len(kernel) // 2, len(kernel[0]) // 2
    return [sum(kernel[j][i] * sample(plane, y + j - rh, x + i - rw, mode)
                for j in range(len(kernel)) for i in range(len(kernel[0])))
            for y in range(len(plane)) for x in range(len(plane[0]))]


def median_reference(plane, radius, mode):
    return [sorted(sample(plane, y + dy, x + dx, mode)
                   for dy in range(-radius, radius + 1) for dx in range(-radius, radius + 1))
            [(2 * radius + 1)**2 // 2]
            for y in range(len(plane)) for x in range(len(plane[0]))]


def morphology_reference(plane, operation, footprint):
    if operation in ('open', 'close'):
        first, second = ('erode', 'dilate') if operation == 'open' else ('dilate', 'erode')
        values = morphology_reference(plane, first, footprint)
        width = len(plane[0])
        return morphology_reference([values[i:i+width] for i in range(0, len(values), width)], second, footprint)
    exterior = int(operation == 'erode')
    reduce = min if exterior else max
    offsets = [(dy, dx) for dy in range(-1, 2) for dx in range(-1, 2)
               if footprint == 'square' or abs(dx) + abs(dy) <= 1]
    return [reduce(plane[y+dy][x+dx] if 0 <= y+dy < len(plane) and 0 <= x+dx < len(plane[0]) else exterior
                   for dy, dx in offsets)
            for y in range(len(plane)) for x in range(len(plane[0]))]


def main():
    if not shutil.which('dyalog'):
        raise SystemExit('Dyalog is missing from PATH; see docs/development.md')
    with tempfile.TemporaryDirectory(prefix='bitmapapl-tests-') as temp:
        folder = Path(temp)
        pixels = [(37 * i + 19) % 256 for i in range(4 * 3 * 4)]
        for top_down, name in [(False, 'bottom'), (True, 'top')]:
            (folder / (name + '.bmp')).write_bytes(bmp(4, 3, pixels, top_down))
        valid = bmp(4, 3, pixels)
        invalid = {'truncated': valid[:-1], 'short': b'BM', 'signature': b'XX' + valid[2:]}
        for name, offset, fmt, value in [('bpp', 28, '<H', 24), ('compression', 30, '<I', 3),
                                        ('dib', 14, '<I', 108), ('offset', 10, '<I', 58),
                                        ('width', 18, '<i', -1), ('height', 22, '<i', 0),
                                        ('size', 2, '<I', 55), ('image_size', 34, '<I', 1),
                                        ('palette', 46, '<I', 1), ('planes', 26, '<H', 2)]:
            data = bytearray(valid)
            struct.pack_into(fmt, data, offset, value)
            invalid[name] = bytes(data)
        for name, data in invalid.items():
            (folder / (name + '.bmp')).write_bytes(data)
        planes = [
            [[0, 0, 0, 0, 0], [0, 0, 255, 0, 0], [0, 0, 0, 0, 0]],
            [[0, 0, 255, 255], [0, 0, 255, 255]],
            [[73] * 4 for _ in range(3)],
            [[3, -7, 91, 14], [23, 150, 21, 30], [8, 4, 80, 64]],
            [[12]], [[1, 2, 3]], [[1], [2], [3]],
            [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
        ]
        cases = []
        for plane in planes:
            for radius, sigma in [(0, 1), (1, 0.7), (4, 2)]:
                for mode in ['zero', 'clamp', 'reflect']:
                    cases.append(dict(shape=[len(plane), len(plane[0])],
                                      pixels=sum(plane, []), radius=radius, sigma=sigma,
                                      mode=mode, expected=reference(plane, radius, sigma, mode)))
        edge_cases = []
        for plane in planes:
            for mode in ['zero', 'clamp', 'reflect']:
                kx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
                gy_kernel = [list(row) for row in zip(*kx)]
                gx, gy = correlate(plane, kx, mode), correlate(plane, gy_kernel, mode)
                arbitrary = [[2, -1, 3, 0, -2]]
                blurred = reference(plane, 2, 1, mode)
                flat = sum(plane, [])
                edge_cases.append(dict(shape=[len(plane), len(plane[0])], pixels=flat, mode=mode,
                    gx=gx, gy=gy, magnitude=[math.hypot(x, y) for x, y in zip(gx, gy)],
                    correlation=correlate(plane, arbitrary, mode),
                    unsharp=[p + 1.5 * (p - b) for p, b in zip(flat, blurred)]))
        medians = []
        for plane in planes + [[[0.5, -2.3, 0.5], [255, 30, 30], [0, 30, 30]]]:
            for radius in [0, 1, 3]:
                for mode in ['zero', 'clamp', 'reflect']:
                    medians.append(dict(shape=[len(plane), len(plane[0])], pixels=sum(plane, []),
                                        radius=radius, mode=mode, expected=median_reference(plane, radius, mode)))
        # Exhaust all 2×3 binary planes, then exercise a speck, a hole, and a border-touching block.
        shapes = [[[int(bits & (1 << (y*3+x)) != 0) for x in range(3)] for y in range(2)]
                  for bits in range(64)]
        shapes += [[[int(1 <= y <= 5 and 1 <= x <= 5 and (y,x) != (3,3))
                     if (y,x) != (0,0) else 1 for x in range(7)] for y in range(7)],
                   [[1]], [[0]], [[1,0,1,1,0]], [[1],[0],[1]]]
        morphs = []
        for plane in shapes:
            for footprint in ['square', 'cross']:
                for operation in ['dilate', 'erode', 'open', 'close']:
                    morphs.append(dict(shape=[len(plane), len(plane[0])], pixels=sum(plane, []),
                                       operation=operation, footprint=footprint,
                                       expected=morphology_reference(plane, operation, footprint)))
        (folder / 'oracle.json').write_text(json.dumps(dict(cases=cases, edges=edge_cases, medians=medians, morphs=morphs, pixels=pixels,
                                                          invalid=list(invalid))))
        escaped = str(folder).replace("'", "''")
        runner = folder / 'run.apls'
        runner.write_text("⎕TRAP←(0 'E' '⎕←⎕DM ⋄ ⎕OFF 1')\n"
                          "{}⎕FIX 'file://src/ImageOps.dyalog'\n"
                          "{}⎕FIX 'file://bitmap.dyalog'\n"
                          "{}⎕FIX 'file://tests/Suite.dyalog'\n"
                          f"Suite.Run '{escaped}'\n⎕OFF 0\n")
        subprocess.run(['dyalog', '-script', str(runner)], cwd=ROOT,
                       env={**os.environ, 'ENABLE_CEF': '0'}, check=True, timeout=60)
        for name in ['top', 'bottom']:
            assert (folder / (name + '-roundtrip.bmp')).read_bytes() == (folder / (name + '.bmp')).read_bytes()
        # Verify the adapter's blur and BGRX serialization against the independent oracle.
        expected_channels = []
        for c in range(3):
            plane = [[pixels[(y * 4 + x) * 4 + c] for x in range(4)] for y in range(3)]
            expected_channels.append(reference(plane, 2, 1, 'reflect'))
        expected_pixels = [max(0, min(255, math.floor(expected_channels[c][i] + 0.5)))
                           if c < 3 else pixels[4 * i + c]
                           for i in range(12) for c in range(4)]
        assert (folder / 'blurred.bmp').read_bytes() == bmp(4, 3, expected_pixels)
        clamped = pixels.copy()
        clamped[:4] = [0, 1, 255, 255]
        assert (folder / 'clipped.bmp').read_bytes() == bmp(4, 3, clamped)
        if '--export' in sys.argv:
            verified = json.loads((folder / 'verified.json').read_text())
            target = ROOT / 'web' / 'fixtures' / 'apl-reference.json'
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(dict(schema=1, generator='Dyalog ImageOps',
                cases=verified['cases'], edges=verified['edges'], medians=verified['medians'], morphs=verified['morphs']), separators=(',', ':')) + '\n')
            print('Exported Dyalog results to web/fixtures/apl-reference.json')
        print('PASS: independent BMP byte checks, round trips, clipping, and blur output')


if __name__ == '__main__':
    main()
