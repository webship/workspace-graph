import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

import { register, WORKSPACE_KEY } from '../src/index';

const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');

test('the manifest names the workspace folder, and every file it names ships', () => {
  const m = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).workspacePlugin;
  assert.strictEqual(m.name, 'graph');
  assert.strictEqual(m.workspace.key, WORKSPACE_KEY);
  for (const f of [m.workspace.settingsTemplate, ...m.workspace.files, ...m.workspace.docs, ...m.features]) assert.ok(fs.existsSync(path.join(PKG, f)), `${f} is in the package`);
  const settings = fs.readFileSync(path.join(PKG, m.workspace.settingsTemplate), 'utf8');
  assert.match(settings, new RegExp(`^doc:\\n  name: ${WORKSPACE_KEY}$`, 'm'), 'the settings file describes this folder');
  for (const f of m.workspace.files) assert.match(fs.readFileSync(path.join(PKG, f), 'utf8'), /^#!\/usr\/bin\/env bash/, `${f} is a bash script`);
});

test('register() adds the assistant context and nothing else', () => {
  const calls: string[] = [];
  const api: any = { name: 'graph', addAssistantContext: (fn: () => string) => calls.push(fn()) };
  register(api);
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0], /graphs\//);
});
