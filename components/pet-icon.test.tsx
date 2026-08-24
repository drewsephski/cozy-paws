import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PetIcon } from './pet-icon';

describe('PetIcon', () => {
  it('renders persisted icon identifiers through the animated Lucide interface', () => {
    expect(renderToStaticMarkup(<PetIcon value="dog" className="size-5" />)).toContain(
      'data-animated-lucide="Dog"'
    );
  });

  it('preserves the legacy emoji fallback contract', () => {
    const markup = renderToStaticMarkup(<PetIcon value="🐕" fallbackClassName="text-4xl" />);
    expect(markup).toContain('text-4xl');
    expect(markup).toContain('🐕');
    expect(markup).not.toContain('<svg');
  });
});
