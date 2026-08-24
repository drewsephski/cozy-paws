import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PublicProfileDetails } from './profile-details';

describe('public availability and trust details', () => {
  it('renders restrained advisory availability and explicitly self-reported trust details', () => {
    const html = renderToStaticMarkup(<PublicProfileDetails profile={{
      emoji: 'dog', createdAt: 1, availabilityStatus: 'UNAVAILABLE', availabilityUntil: '2026-09-14',
      yearsExperience: 7, careCapabilities: ['Senior pets', 'Medication'], meetAndGreetExpectations: 'A short home visit first.',
      cancellationExpectations: 'Please give 48 hours notice.', selfReportedCredentials: ['Pet first aid course']
    }} />);
    expect(html).toContain('Unavailable until September 14, 2026');
    expect(html).toContain('may change');
    expect(html).toContain('7 years of self-reported experience');
    expect(html).toContain('Self-reported credentials');
    expect(html).toContain('does not verify insurance');
  });

  it('renders rich imported profile sections as plain text when present', () => {
    const html = renderToStaticMarkup(<PublicProfileDetails profile={{ emoji: 'dog', createdAt: 1, about: 'I keep pets on their familiar routine.', careRoutine: 'Morning walks and evening play.', homeEnvironment: 'Quiet home with a fenced yard.', petPreferences: 'Comfortable with cats and senior dogs.', experienceSummary: 'Seven years caring for neighborhood pets.', specialCareSummary: 'Oral medications with written instructions.' }} />);
    expect(html).toContain('About');
    expect(html).toContain('Morning walks and evening play.');
    expect(html).toContain('Home environment');
    expect(html).toContain('Special care');
  });
});
