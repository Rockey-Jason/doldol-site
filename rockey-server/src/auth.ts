import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error('SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY are required.');
}

export const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const authVerifier = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

export interface VerifiedPlayer {
  id: string;
  siteUserId: string;
  name: string;
}

export async function verifyPlayer(accessToken: string): Promise<VerifiedPlayer> {
  if (!accessToken || accessToken.length > 8192) throw new Error('INVALID_TOKEN');

  const { data, error } = await authVerifier.auth.getUser(accessToken);
  if (error || !data.user) throw new Error('UNAUTHORIZED');

  const authUserId = data.user.id;
  const { data: mapping, error: mappingError } = await admin
    .from('dori_bank_identity_map')
    .select('site_user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (mappingError || !mapping?.site_user_id) throw new Error('SITE_ACCOUNT_NOT_LINKED');

  const { data: siteUser, error: userError } = await admin
    .from('users')
    .select('user_id,name,permanently_banned,suspended_until')
    .eq('user_id', mapping.site_user_id)
    .maybeSingle();

  if (userError || !siteUser) throw new Error('SITE_USER_NOT_FOUND');
  if (siteUser.permanently_banned) throw new Error('ACCOUNT_BANNED');

  if (
    siteUser.suspended_until &&
    new Date(siteUser.suspended_until).getTime() > Date.now()
  ) {
    throw new Error('ACCOUNT_SUSPENDED');
  }

  const displayName = String(siteUser.name || 'ROCKEY PLAYER').slice(0, 24);
  const { error: profileError } = await admin
    .from('rockey_profiles')
    .upsert({
      auth_user_id: authUserId,
      site_user_id: mapping.site_user_id,
      display_name: displayName
    }, { onConflict: 'auth_user_id', ignoreDuplicates: true });

  if (profileError) throw new Error('PROFILE_INIT_FAILED');
  return { id: authUserId, siteUserId: mapping.site_user_id, name: displayName };
}