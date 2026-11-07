const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..');
const icons = path.join(root, 'assets', 'icons');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function checkPng(buffer, size) {
  assert.deepEqual(buffer.subarray(0, 8), pngSignature);
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR');
  assert.equal(buffer.readUInt32BE(16), size);
  assert.equal(buffer.readUInt32BE(20), size);
  assert.equal(buffer[24], 8);
  assert.equal(buffer[25], 6);
  let offset = 8;
  const data = [];
  let ended = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    assert.ok(offset + length + 12 <= buffer.length, 'PNG chunk extends beyond file');
    if (type === 'IDAT') data.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
    if (type === 'IEND') { ended = true; break; }
  }
  assert.ok(ended && data.length, 'PNG missing image data or ending');
  assert.equal(zlib.inflateSync(Buffer.concat(data)).length, size * (size * 4 + 1));
}

test('favicon images have the required formats and sizes', () => {
  checkPng(fs.readFileSync(path.join(icons, 'favicon-32x32.png')), 32);
  checkPng(fs.readFileSync(path.join(icons, 'apple-touch-icon.png')), 180);

  const ico = fs.readFileSync(path.join(icons, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16;
    assert.equal(ico[entry], size);
    assert.equal(ico[entry + 1], size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset >= 54 && offset + length <= ico.length);
    checkPng(ico.subarray(offset, offset + length), size);
  }

  const svg = fs.readFileSync(path.join(icons, 'favicon.svg'), 'utf8');
  assert.match(svg, /<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 64 64"/);
  for (const colour of ['#477bff', '#17233b', '#ffd45a']) assert.ok(svg.includes(colour));
});

test('all pages reference each local favicon format in the head', () => {
  const links = [
    '<link rel="icon" href="assets/icons/favicon.ico" sizes="any">',
    '<link rel="icon" href="assets/icons/favicon-32x32.png" type="image/png" sizes="32x32">',
    '<link rel="icon" href="assets/icons/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png" sizes="180x180">'
  ];
  for (const page of ['index.html', 'quiz.html', 'geography.html', 'daily.html', 'about.html', 'picture-perfect.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const head = html.match(/<head>([\s\S]*?)<\/head>/i);
    assert.ok(head, `${page} has no head`);
    for (const link of links) assert.ok(head[1].includes(link), `${page} missing ${link}`);
  }
});
