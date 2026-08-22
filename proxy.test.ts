import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('proxy host routing', () => {
  it('leaves canonical-host redirects to the deployment platform', async () => {
    const request = new NextRequest(
      'http://www.localhost:3000/auth?mode=sign-up&callbackURL=%2Flaunch'
    );

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('does not redirect the canonical root host', async () => {
    const response = await proxy(new NextRequest('http://localhost:3000/auth'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
