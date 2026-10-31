const supabase = require('../config/supabaseClient');

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolves user entitlements (`isPro`, `isAdmin`) with `profiles` as the source of truth.
 * If `is_admin` is true, ALL quotas and PRO restrictions are bypassed globally.
 * Also performs a one-time promotion in `profiles` if a verified auth user matches `ADMIN_EMAILS`.
 */
async function getUserEntitlements(userId) {
  if (!userId || userId === 'anonymous') {
    return { isPro: false, isAdmin: false };
  }

  let profile = null;

  // Query `profiles` (source of truth), falling back gracefully if `is_admin` migration hasn't run yet
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('is_pro, is_admin')
    .eq('user_id', userId)
    .limit(1);

  if (error && error.message && error.message.includes('is_admin')) {
    const { data: fallbackRows } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('user_id', userId)
      .limit(1);
    profile = fallbackRows && fallbackRows[0] ? { ...fallbackRows[0], is_admin: false } : null;
  } else if (!error) {
    profile = rows && rows[0] ? rows[0] : null;
  }

  let isAdmin = Boolean(profile?.is_admin === true);
  let isPro = Boolean(profile?.is_pro === true || isAdmin);

  // Bootstrap/seed `profiles.is_admin` if user's verified Auth email is in ADMIN_EMAILS
  if (!isAdmin) {
    const adminEmails = parseAdminEmails();
    if (adminEmails.length > 0) {
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(userId);
        const email = authData?.user?.email?.toLowerCase();
        if (email && adminEmails.includes(email)) {
          isAdmin = true;
          isPro = true;

          // Persist into `profiles` so the database remains the single source of truth
          if (profile) {
            await supabase
              .from('profiles')
              .update({ is_admin: true, is_pro: true })
              .eq('user_id', userId);
          } else {
            await supabase
              .from('profiles')
              .insert([{ user_id: userId, is_admin: true, is_pro: true }]);
          }
        }
      } catch (err) {
        console.warn('[Entitlements] Could not verify admin email bootstrap:', err.message);
      }
    }
  }

  return { isPro, isAdmin };
}

module.exports = { getUserEntitlements };

