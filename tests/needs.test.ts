/**
 * What this plugin needs from the workspace it is added to and from the machine (the manifest's `needs` and `suggests`).
 * The workspace reads them: github.com/webship/workspace, core/workspace-app/PLUGINS.md.
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Compiled, this test runs from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).workspacePlugin;
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

test("the manifest says what the plugin needs: the plugins and the commands it cannot work without, and what a part of it uses", () => {
  assert.deepStrictEqual(manifest.needs, {'commands': ['python3']});
  assert.deepStrictEqual(manifest.suggests, {'plugins': [['dev', 'test', 'sandboxes', 'demos', 'projects', 'products', 'drupal-modules', 'drupal-themes', 'drupal-recipes', 'drupal-profiles', 'drupal-site-templates', 'libraries']], 'commands': [{'command': 'graphify', 'hint': 'cmd-tools-graphify.sh installs it for you with uv or pipx when it is missing'}, ['uv', 'pipx']]});
  const sources = ['commands', 'scripts', 'src'].flatMap((d) => (fs.existsSync(path.join(PKG, d)) ? walk(path.join(PKG, d)) : [])).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const command of ['python3', 'graphify', 'uv', 'pipx']) assert.match(sources, new RegExp(`(^|[^A-Za-z0-9_-])${command}([^A-Za-z0-9_-]|$)`, 'm'), `${command} is called by the plugin`);
  assert.match(fs.readFileSync(path.join(PKG, 'README.md'), 'utf8'), /^## What it needs$/m, 'and the README says so');
});
