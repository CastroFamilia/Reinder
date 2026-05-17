/**
 * apps/web/src/lib/auth/require-platform-admin.ts
 *
 * Story 7.2: Reusable auth guard for platform_admin endpoints.
 * Used by Stories 7.2, 7.3, 7.4 admin API routes.
 *
 * AC5 (7.2): Only platform_admin can access — returns 403 for any other role.
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface PlatformAdminResult {
  user: { id: string; email?: string };
  adminId: string;
}

interface PlatformAdminError {
  error: NextResponse;
}

export type RequirePlatformAdminResult = PlatformAdminResult | PlatformAdminError;

function isError(result: RequirePlatformAdminResult): result is PlatformAdminError {
  return 'error' in result;
}

export { isError as isPlatformAdminError };

/**
 * Verify that the current request is from a platform_admin user.
 * Returns the user info on success, or a pre-built 401/403 NextResponse on failure.
 */
export async function requirePlatformAdmin(): Promise<RequirePlatformAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'platform_admin') {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user, adminId: user.id };
}
