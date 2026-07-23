const test = require('node:test');
const assert = require('node:assert/strict');
const { shuffleItems, getMediaType, parseFolderId, buildPreviewUrl, buildDriveMediaRequestUrl, buildDriveThumbnailUrl, normalizeRedirectUri } = require('./gallery-utils');

test('shuffleItems preserves the array length and contents', () => {
  const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
  const shuffled = shuffleItems(items);

  assert.equal(shuffled.length, items.length);
  assert.deepEqual(shuffled.sort((a, b) => a.id.localeCompare(b.id)), items.slice().sort((a, b) => a.id.localeCompare(b.id)));
});

test('getMediaType detects images, gifs, and videos', () => {
  assert.equal(getMediaType({ name: 'cover.png', mimeType: 'image/png' }), 'image');
  assert.equal(getMediaType({ name: 'loop.gif', mimeType: 'image/gif' }), 'gif');
  assert.equal(getMediaType({ name: 'clip.mp4', mimeType: 'video/mp4' }), 'video');
});

test('parseFolderId and buildPreviewUrl support Drive links', () => {
  assert.equal(parseFolderId('https://drive.google.com/drive/folders/abc123'), 'abc123');
  assert.equal(buildPreviewUrl({ id: 'xyz', mimeType: 'image/png' }), 'https://www.googleapis.com/drive/v3/files/xyz?alt=media');
});

test('normalizeDriveFolderReference extracts folder ids from common Drive URLs', () => {
  assert.equal(parseFolderId('https://drive.google.com/drive/folders/abc123?usp=sharing'), 'abc123');
  assert.equal(parseFolderId('https://drive.google.com/open?id=xyz789'), 'xyz789');
});

test('normalizeRedirectUri preserves the exact configured URI and canonicalizes common local paths', () => {
  assert.equal(normalizeRedirectUri('http://localhost:3000', { origin: 'http://localhost:3000', pathname: '/' }), 'http://localhost:3000');
  assert.equal(normalizeRedirectUri('', { origin: 'http://127.0.0.1:3000', pathname: '/' }), 'http://127.0.0.1:3000/');
  assert.equal(normalizeRedirectUri('', { origin: 'http://localhost:3000', pathname: '/index.html' }), 'http://localhost:3000/');
  assert.equal(normalizeRedirectUri('', { origin: 'http://localhost:3000', pathname: '/gallery/' }), 'http://localhost:3000/gallery/');
});

test('buildDriveMediaRequestUrl returns the authenticated Drive media endpoint', () => {
  assert.equal(buildDriveMediaRequestUrl('abc123'), 'https://www.googleapis.com/drive/v3/files/abc123?alt=media');
});

test('buildDriveThumbnailUrl prefers Drive thumbnail links when present', () => {
  assert.equal(buildDriveThumbnailUrl({ thumbnailLink: 'https://example.com/thumb' }), 'https://example.com/thumb');
  assert.equal(buildDriveThumbnailUrl({ webContentLink: 'https://example.com/file' }), 'https://example.com/file');
});
