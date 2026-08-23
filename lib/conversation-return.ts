import { cookies } from 'next/headers';
import { getCustomerConversation } from './conversations';

const RETURN_LINK_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function conversationReturnCookieName(subdomain: string) {
  return `sitterfolio-conversation-${subdomain.trim().toLowerCase()}`;
}

export async function rememberConversationReturn(subdomain: string, conversationToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(conversationReturnCookieName(subdomain), conversationToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: RETURN_LINK_MAX_AGE_SECONDS
  });
}

export async function getConversationReturnToken(subdomain: string) {
  const cookieStore = await cookies();
  const conversationToken = cookieStore.get(conversationReturnCookieName(subdomain))?.value;
  if (!conversationToken) return null;

  const conversation = await getCustomerConversation(conversationToken);
  return conversation?.subdomain === subdomain ? conversationToken : null;
}
