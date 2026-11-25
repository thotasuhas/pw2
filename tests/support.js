import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html = fs
  .readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  .replace(/<script[^>]*><\/script>/g, '');

/** A fresh copy of the real index.html (without scripts) for DOM tests. */
export function createPage() {
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  return { window: dom.window, doc: dom.window.document };
}

export const sampleReport = {
  place: 'Testville, Nowhere',
  currentAqi: 120,
  currentLabel: '25 Nov, 14:00',
  category: { max: 150, id: 'usg', name: 'Unhealthy for Sensitive Groups' },
  advice: {
    level: { id: 'care', rank: 1, icon: '⚠️', label: 'Take care' },
    headline: 'Reduce activity.',
    actions: ['Do less.', 'Wear a mask.'],
  },
  window: { startLabel: '25 Nov, 18:00', averageAqi: 60 },
  durationHours: 2,
  series: [120, 90, 60, 80].map((aqi, i) => ({ time: `t${i}`, label: `h${i}`, aqi })),
};
