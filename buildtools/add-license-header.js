// SPDX-License-Identifier: Apache-2.0
/**
 * Adds SPDX-License-Identifier to files if
 * they don't have one or if no other license is specified
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const COMMENTS = {
  ts: '//',
  js: '//',
  css: ['/*', ' */'],
  html: ['<!--', '-->'],
  cmd: '::',
  sh: '#'
};

const files = execSync('git diff --cached --name-only --diff-filter=ACM').toString().trim().split('\n').filter(Boolean);

for (const file of files) {
  const ext = file.split('.').pop();
  const fmt = COMMENTS[ext];
  if (!fmt) continue;
  const content = readFileSync(file, 'utf8');
  if (/license|©/i.test(content)) continue;
  const comment = Array.isArray(fmt)
    ? `${fmt[0]} SPDX-License-Identifier: Apache-2.0 ${fmt[1]}`
    : `${fmt} SPDX-License-Identifier: Apache-2.0`;
  writeFileSync(file, `${comment}\n${content}`);
  execSync(`git add ${file}`);
}
