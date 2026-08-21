import { describe, expect, it } from 'vitest';
import { createProfileOwnership } from './profile-ownership';
import { createSiteIntake } from './site-intake';
import { MemoryProfileRepository } from '../tests/support/memory-profile-repository';

describe('site intake', () => {
  it('validates a canonical, available draft address through its interface', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    const intake = createSiteIntake(profiles, () => 100);

    expect(await intake.checkAddress({ subdomain: 'Happy-Tails', icon: 'dog' })).toEqual({
      subdomain: 'Happy-Tails',
      icon: 'dog',
      success: false,
      error: 'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    });
    expect(await intake.checkAddress({ subdomain: 'happy-tails', icon: 'dog' })).toEqual({
      success: true,
      subdomain: 'happy-tails',
      icon: 'dog'
    });
    await profiles.create('owner-1', 'happy-tails', { emoji: 'dog', createdAt: 100 });
    expect(await intake.checkAddress({ subdomain: 'happy-tails', icon: 'dog' })).toMatchObject({
      success: false,
      error: 'This subdomain is already taken'
    });
  });

  it('returns the existing validation errors for missing, invalid, and short addresses', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    const intake = createSiteIntake(profiles);

    await expect(intake.checkAddress({})).resolves.toEqual({
      success: false,
      error: 'Subdomain and icon are required'
    });
    await expect(
      intake.checkAddress({ subdomain: 'happy-tails', icon: 'not-an-icon' })
    ).resolves.toMatchObject({
      success: false,
      error: 'Please enter a valid emoji (maximum 10 characters)'
    });
    await expect(intake.checkAddress({ subdomain: 'hi', icon: 'dog' })).resolves.toMatchObject({
      success: false,
      error: 'Choose a name between 3 and 30 characters.'
    });
  });

  it('normalizes draft fields and persists a launched site once', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    const intake = createSiteIntake(profiles, () => 500);
    const draft = {
      subdomain: 'HAPPY-TAILS',
      icon: 'dog',
      businessName: '  Happy Tails  ',
      tagline: '  Trusted neighborhood care.  ',
      location: '  Oak Park  ',
      services: ' Walks, Drop-ins, Overnight, One, Two, Three, Four, Five, Ignored ',
      email: ' hello@example.com ',
      phone: ' 555-0100 '
    };

    expect(await intake.launch('owner-1', draft)).toEqual({
      success: true,
      subdomain: 'happy-tails'
    });
    expect(await profiles.getOwned('happy-tails', 'owner-1')).toMatchObject({
      businessName: 'Happy Tails',
      tagline: 'Trusted neighborhood care.',
      location: 'Oak Park',
      services: ['Walks', 'Drop-ins', 'Overnight', 'One', 'Two', 'Three', 'Four', 'Five'],
      email: 'hello@example.com',
      phone: '555-0100',
      createdAt: 500,
      onboardingCompletedAt: 500
    });
    expect(await intake.launch('owner-2', draft)).toEqual({
      success: false,
      error: 'That site address was just taken. Choose another address to launch.'
    });
    expect(await profiles.listOwned('owner-2')).toEqual([]);
  });

  it('rejects incomplete launch drafts without persistence', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    const intake = createSiteIntake(profiles);

    expect(
      await intake.launch('owner-1', {
        subdomain: 'happy-tails',
        icon: 'dog',
        businessName: 'Happy Tails',
        tagline: 'Trusted care',
        location: 'Oak Park',
        services: 'Walks',
        email: 'not-an-email',
        phone: ''
      })
    ).toEqual({
      success: false,
      error: 'Your draft is incomplete. Return to the builder and finish the required details.'
    });
    expect(await profiles.get('happy-tails')).toBeNull();
  });

  it('coerces untrusted form values inside the intake interface', async () => {
    const profiles = createProfileOwnership(new MemoryProfileRepository());
    const intake = createSiteIntake(profiles);

    await expect(
      intake.launch('owner-1', {
        subdomain: 123,
        icon: null,
        businessName: {},
        services: []
      })
    ).resolves.toMatchObject({
      success: false,
      error: 'Your draft address is invalid. Return to the home page and choose another.'
    });
  });
});
