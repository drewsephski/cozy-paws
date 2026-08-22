import { NextRequest, NextResponse } from 'next/server';
import { createOrContinueOnboarding } from '@/lib/connected-accounts';
import { getSession } from '@/lib/session';
import { getAppOrigin } from '@/lib/app-url';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(`${getAppOrigin()}/auth?callbackURL=%2Fadmin`);

  try {
    const url = await createOrContinueOnboarding(session.user.id, request.nextUrl.searchParams.get('businessId') ?? '');
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${getAppOrigin()}/admin?stripe=error`);
  }
}
