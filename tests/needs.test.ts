/**
 * What this plugin suggests of the workspace it is added to (the manifest's `suggests`).
 * The workspace reads it: github.com/webship/workspace, core/workspace-app/PLUGINS.md.
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Compiled, this test runs from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).workspacePlugin;

test("the manifest suggests a folder of projects to map, and needs nothing", () => {
  assert.ok(Array.isArray(manifest.suggests) && manifest.suggests.length === 1 && Array.isArray(manifest.suggests[0]));
  for (const must of ['dev', 'test', 'sandboxes', 'demos', 'projects', 'drupal-modules', 'libraries']) assert.ok(manifest.suggests[0].includes(must), must);
  assert.ok(!manifest.suggests[0].includes(manifest.name), 'never itself');
  assert.deepStrictEqual(manifest.commands.types, ['sites', 'code'], 'the folders its commands go to are the sites and code ones');
  assert.strictEqual(manifest.needs, undefined);
  assert.match(fs.readFileSync(path.join(PKG, 'README.md'), 'utf8'), /^## What it goes with$/m, 'and the README says so');
});
