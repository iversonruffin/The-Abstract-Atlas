import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guards against a deploy-time bug the unit tests can't see: if the API route uses `Method: ANY`,
// browsers' CORS preflight (OPTIONS) requests reach the Lambda, get a 404, and every call from the
// website fails with "Response to preflight request doesn't pass access control check".
describe('template.yaml routing', () => {
  // Comments are stripped so the explanation in the template itself doesn't trip the checks.
  const template = readFileSync(new URL('../template.yaml', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');

  it('does not route OPTIONS (or ANY) to the Lambda, so API Gateway answers CORS preflights', () => {
    expect(template).not.toMatch(/Method:\s*ANY/);
    expect(template).not.toMatch(/Method:\s*OPTIONS/);
  });

  it('routes every method the API actually uses', () => {
    for (const method of ['GET', 'POST', 'PATCH']) {
      expect(template).toMatch(new RegExp(`Method:\\s*${method}\\b`));
    }
  });

  it('allows the headers the website sends', () => {
    expect(template).toMatch(/AllowHeaders:\s*\[[^\]]*x-guest-token[^\]]*\]/);
    expect(template).toMatch(/AllowHeaders:\s*\[[^\]]*authorization[^\]]*\]/);
  });
});
