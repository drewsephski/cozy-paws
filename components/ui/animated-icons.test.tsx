import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LinkedIn } from './animated-icons';

describe('animated icons', () => {
  it('renders the attributed LinkedIn geometry with Lucide SVG semantics', () => {
    const markup = renderToStaticMarkup(<LinkedIn aria-hidden="true" />);

    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('stroke-linecap="round"');
    expect(markup).toContain('M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z');
    expect(markup).toContain('<rect x="2" y="9" width="4" height="12"');
    expect(markup).toContain('<circle cx="4" cy="4" r="2"');
  });
});
