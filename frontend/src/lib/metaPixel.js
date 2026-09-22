/**
 * Meta Pixel — disabled.
 *
 * Feedify is a done-for-you agency now: there is no ad funnel to optimise, and
 * the owner reads signups and onboarding completions straight from the Admin
 * Panel. The tracking script is gone from index.html; these stubs stay so the
 * handful of call sites left in older pages keep compiling without each needing
 * an edit, and so nothing silently starts tracking again if the script returns.
 */

export function fbTrack() { /* no-op */ }

export function generateEventId() { return null; }

export function getCachedUserId() { return null; }

export function cacheUserId() { /* no-op */ }

export default { fbTrack, generateEventId, getCachedUserId, cacheUserId };
