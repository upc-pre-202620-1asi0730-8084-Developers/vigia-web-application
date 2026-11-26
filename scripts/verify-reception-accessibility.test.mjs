import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const receptionViews = [
  'src/site-reception-and-verification/presentation/views/reception-management-view.vue',
  'src/site-reception-and-verification/presentation/views/register-reception-page.vue',
  'src/site-reception-and-verification/presentation/views/report-discrepancy-page.vue',
  'src/site-reception-and-verification/presentation/components/site-manager-reception-view.vue',
  'src/site-reception-and-verification/presentation/components/supervisor-reception-view.vue',
  'src/site-reception-and-verification/presentation/components/evidence-gallery-dialog.vue'
];

test('reception views do not use javascript:void(0) links or hardcoded bilingual option strings', () => {
  for (const rel of receptionViews) {
    const src = read(rel);
    assert.equal(src.includes('javascript:void(0)'), false, `${rel} still uses javascript:void(0)`);
    assert.equal(src.includes('(Last 7 days)'), false, `${rel} has hardcoded bilingual filter label`);
    assert.equal(src.includes('(All projects)'), false, `${rel} has hardcoded bilingual project option`);
    assert.equal(src.includes('title="Más opciones"'), false, `${rel} has hardcoded Spanish title`);
  }
});

test('reception management view exposes accessible perspective toggle and live loading status', () => {
  const src = read(receptionViews[0]);
  assert.match(src, /role="group"/);
  assert.match(src, /:aria-pressed="currentPerspective === 'site_manager'"/);
  assert.match(src, /:aria-pressed="currentPerspective === 'supervisor'"/);
  assert.match(src, /role="status"\s+aria-live="polite"/);
});

test('clickable reception table rows and detail panels support keyboard activation and ARIA landmarks', () => {
  for (const rel of [receptionViews[3], receptionViews[4]]) {
    const src = read(rel);
    assert.match(src, /tabindex="0"/, `${rel} missing tabindex on clickable rows`);
    assert.match(src, /@keydown\.enter\.prevent="selectRow\(rec\)"/, `${rel} missing Enter handler`);
    assert.match(src, /@keydown\.space\.prevent="selectRow\(rec\)"/, `${rel} missing Space handler`);
    assert.match(src, /:aria-selected=/, `${rel} missing aria-selected`);
    assert.match(src, /<aside[^>]+:aria-label="t\('receptions\.a11y\.detailsPanel'\)"/, `${rel} missing details aside label`);
  }
});

test('register reception and report discrepancy pages announce errors and guide form submission', () => {
  const reg = read(receptionViews[1]);
  assert.match(reg, /role="alert"\s+aria-live="assertive"/);
  assert.match(reg, /for="receipt-arrival"/);
  assert.match(reg, /aria-describedby="receipt-observations-count"/);

  const disc = read(receptionViews[2]);
  assert.match(disc, /role="alert"/);
  assert.match(disc, /aria-required="true"/);
  assert.match(disc, /aria-describedby="discrepancy-observations-meta discrepancy-submit-hint"/);
});
