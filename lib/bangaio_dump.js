// bangaio-nx-installer: the shader containers in Bangai-O HD's own files, by the rules of bangaio-nx's native dump
// (tools/renut_shader_dump.py over the executable's image, plus tools/bangaio_shader_files.py's files):
//   - the executable's image (default.xex decrypted and unpacked by lib/xex.js): containers compiled into it are stored
//     whole (magic 0x102A11xx, low bit 1 = vertex shader), found as reNut's dump_shaders.py find_shader_headers finds
//     them;
//   - media/shader/*.xvu and *.xpu: whole containers (header + virtual + physical part) the game passes to
//     Create*Shader as they are.
// From nights-nx-installer's lib/nights_dump.js (the same rules, NiGHTS's file names). Bangai-O has no title update,
// and its native build's 95 shaders are all in these two places.

const be32 = (d, o) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;

// The offsets of the containers in 'data' (find_shader_headers).
export function findShaderHeaders(data) {
  const found = [];
  for (let o = 0; o + 0x24 <= data.length; o += 4) {
    if (data[o] !== 0x10 || data[o + 1] !== 0x2a || data[o + 2] !== 0x11) continue;
    const virt = be32(data, o + 4), phys = be32(data, o + 8);
    const ct = be32(data, o + 0x10), dt = be32(data, o + 0x14), so = be32(data, o + 0x18);
    if (!(virt >= 0x24 && virt < 0x10000 && phys > 0 && phys < 0x100000 && o + virt <= data.length)) continue;
    if (ct >= virt || dt >= virt || !(so >= 0x24 && so < virt - 8)) continue;
    if (be32(data, o + so) + be32(data, o + so + 4) !== phys) continue;
    found.push(o);
  }
  return found;
}

// The containers compiled into the executable's image.
export function imageContainers(image) {
  const out = [];
  for (const o of findShaderHeaders(image)) {
    const size = be32(image, o + 4) + be32(image, o + 8);
    if (o + size <= image.length) out.push(image.slice(o, o + size));
  }
  return out;
}

// A stand-alone container file (media/shader/*.xvu, *.xpu), or null.
export function fileContainer(bytes) {
  if (bytes.length < 0x24 || bytes[0] !== 0x10 || bytes[1] !== 0x2a || bytes[2] !== 0x11) return null;
  const size = be32(bytes, 4) + be32(bytes, 8);
  return size <= bytes.length ? bytes.slice(0, size) : null;
}

export const isShaderFile = (path) => /^media\/shader\/[^/]+\.x[pv]u$/i.test(path);
