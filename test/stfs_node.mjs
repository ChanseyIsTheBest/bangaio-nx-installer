// bangaio-nx-installer: the game's package read in place by lib/stfs.js (as worker.js reads it for the zip's
// game_root/), against the folder the game was extracted to (bangaio-nx's tools/stfs_extract.py): every file there, the
// same bytes.
//   node test/stfs_node.mjs <the game's package> <extracted game folder>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { StfsPackage } from '../lib/stfs.js';

const [packagePath, folder] = process.argv.slice(2);
const fd = fs.openSync(packagePath, 'r');
const reader = {
  size: fs.fstatSync(fd).size,
  read: async (offset, length) => {
    const out = new Uint8Array(length);
    fs.readSync(fd, out, 0, length, offset);
    return out;
  },
};
const pkg = await StfsPackage.open(reader);
console.log(`title ${pkg.header.titleId.toString(16).toUpperCase()}, content type ${pkg.header.contentType.toString(16)}, ` +
            `"${pkg.header.displayName}"`);
const files = pkg.files();
const listed = new Set();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
  const full = path.join(dir, e.name);
  if (e.isDirectory()) walk(full);
  else listed.add(path.relative(folder, full).split(path.sep).join('/'));
});
walk(folder);
let same = 0, differ = 0, bytes = 0;
for (const f of files) {
  const data = await f.read(0, f.size);
  const mine = crypto.createHash('sha256').update(data).digest('hex');
  const theirs = listed.has(f.path) ? crypto.createHash('sha256').update(fs.readFileSync(path.join(folder, f.path))).digest('hex') : null;
  if (mine === theirs) same++;
  else { differ++; if (differ <= 5) console.log(`differs: ${f.path}${theirs ? '' : ' (not in the folder)'}`); }
  listed.delete(f.path);
  bytes += f.size;
}
console.log(`${files.length} files in the package (${(bytes / 1048576).toFixed(1)} MiB): ${same} the same as the folder's, ` +
            `${differ} different; ${listed.size} files of the folder not in the package`);
process.exit(differ || listed.size ? 1 : 0);
