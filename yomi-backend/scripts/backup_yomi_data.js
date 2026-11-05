#!/usr/bin/env node
/**
 * Yomi-AI — Automated Local SRS & Immersion Data Backup Script
 *
 * Connects to Supabase using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `yomi-backend/.env`,
 * locates the personal Admin account via `ADMIN_EMAILS`, exports full paginated tables
 * (`profiles`, `flashcards`, `review_logs`, plus `dialogues`, `output_challenges`, and `stories`),
 * and writes a formatted JSON snapshot to `<repo-root>/backups/yomi_backup_YYYY-MM-DD.json`.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_DIR, '..');
const ENV_PATH = path.join(BACKEND_DIR, '.env');
const BACKUPS_DIR = path.join(REPO_ROOT, 'backups');

require('dotenv').config({ path: ENV_PATH, quiet: true });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAW_ADMIN_EMAILS = process.env.ADMIN_EMAILS || '';

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseAdminEmails(raw) {
  return String(raw || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Fetches all rows across PostgREST 1,000-row pages so large SRS decks never truncate.
 */
async function fetchAllRows(buildQuery, pageSize = 1000) {
  const allRows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) {
      throw error;
    }
    const batch = data || [];
    allRows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return allRows;
}

/**
 * Optional table export (returns [] cleanly if an optional table does not exist).
 */
async function fetchOptionalTableRows(label, buildQuery) {
  try {
    return await fetchAllRows(buildQuery);
  } catch (err) {
    console.warn(`  [Notice] Skipping optional table "${label}": ${err.message}`);
    return [];
  }
}

/**
 * Fetches all `review_logs` belonging to the user's `flashcards` in safe ID chunks.
 * Gracefully returns [] if the `review_logs` table migration has not been applied yet.
 */
async function fetchReviewLogsForCards(supabase, cardIds, chunkSize = 200) {
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return [];
  }

  const allLogs = [];
  try {
    for (let i = 0; i < cardIds.length; i += chunkSize) {
      const idChunk = cardIds.slice(i, i + chunkSize);
      const chunkLogs = await fetchAllRows(() =>
        supabase
          .from('review_logs')
          .select('*')
          .in('card_id', idChunk)
          .order('reviewed_at', { ascending: true })
      );
      allLogs.push(...chunkLogs);
    }
  } catch (err) {
    console.warn(`  [Notice] Skipping "review_logs" (${err.message})`);
    return [];
  }

  allLogs.sort((a, b) =>
    String(a.reviewed_at || '').localeCompare(String(b.reviewed_at || ''))
  );
  return allLogs;
}

async function resolveAdminUser(supabase, adminEmails) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const matched = users.find(
      (u) => u.email && adminEmails.includes(u.email.toLowerCase())
    );
    if (matched) {
      return matched;
    }

    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
}

async function runBackup() {
  console.log('==============================================================');
  console.log('  Yomi-AI — Local SRS & Immersion Progress Backup');
  console.log('==============================================================\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      `[Error] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ${ENV_PATH}`
    );
    process.exit(1);
  }

  const adminEmails = parseAdminEmails(RAW_ADMIN_EMAILS);
  if (adminEmails.length === 0) {
    console.error(
      `[Error] ADMIN_EMAILS is not configured in ${ENV_PATH}. Add ADMIN_EMAILS=your@email.com.`
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`[1/4] Connecting to Supabase (${SUPABASE_URL})...`);
  const adminUser = await resolveAdminUser(supabase, adminEmails);

  if (!adminUser) {
    console.error(
      `[Error] No Supabase Auth user found matching ADMIN_EMAILS (${adminEmails.join(', ')}).`
    );
    process.exit(1);
  }

  const userId = adminUser.id;
  console.log(`  -> Matched Admin User: ${adminUser.email} (${userId})\n`);

  console.log('[2/4] Exporting core SRS tables (`profiles`, `flashcards`, `review_logs`)...');
  const profiles = await fetchAllRows(() =>
    supabase.from('profiles').select('*').eq('user_id', userId)
  );

  const flashcards = await fetchAllRows(() =>
    supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  );

  const cardIds = flashcards.map((card) => card.id).filter(Boolean);
  const reviewLogs = await fetchReviewLogsForCards(supabase, cardIds);

  console.log(
    `  -> Exported ${profiles.length} profile(s), ${flashcards.length} flashcard(s), ${reviewLogs.length} review log(s)\n`
  );

  console.log('[3/4] Exporting immersion tables (`dialogues`, `manga_chapters`, `output_challenges`, `stories`)...');
  const dialogues = await fetchOptionalTableRows('dialogues', () =>
    supabase
      .from('dialogues')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  );

  const mangaChapters = await fetchOptionalTableRows('manga_chapters', () =>
    supabase
      .from('manga_chapters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  );

  const outputChallenges = await fetchOptionalTableRows('output_challenges', () =>
    supabase
      .from('output_challenges')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  );

  const stories = await fetchOptionalTableRows('stories', () =>
    supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  );

  console.log(
    `  -> Exported ${dialogues.length} dialogue(s), ${mangaChapters.length} manga chapter(s), ${outputChallenges.length} trainer challenge(s), ${stories.length} story/stories\n`
  );

  console.log('[4/4] Writing formatted JSON snapshot to local `backups/` directory...');
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const dateStamp = formatLocalDate(new Date());
  const outputPath = path.join(BACKUPS_DIR, `yomi_backup_${dateStamp}.json`);

  const backupPayload = {
    metadata: {
      project: 'Yomi-AI',
      schema_version: 'phase7-manga-vision',
      exported_at: new Date().toISOString(),
      supabase_url: SUPABASE_URL,
      admin_email: adminUser.email,
      user_id: userId,
      counts: {
        profiles: profiles.length,
        flashcards: flashcards.length,
        review_logs: reviewLogs.length,
        dialogues: dialogues.length,
        manga_chapters: mangaChapters.length,
        output_challenges: outputChallenges.length,
        stories: stories.length,
      },
    },
    data: {
      profiles,
      flashcards,
      review_logs: reviewLogs,
      dialogues,
      manga_chapters: mangaChapters,
      output_challenges: outputChallenges,
      stories,
    },
  };

  const formattedJson = JSON.stringify(backupPayload, null, 2);
  fs.writeFileSync(outputPath, formattedJson, 'utf8');

  const sizeKb = (Buffer.byteLength(formattedJson, 'utf8') / 1024).toFixed(2);
  console.log(`  -> Saved successfully: ${outputPath} (${sizeKb} KB)`);
  console.log('\nBackup completed successfully.');
}

runBackup().catch((err) => {
  const causeCode = err?.cause?.code || err?.code || '';
  if (causeCode === 'ENOTFOUND' || String(err?.message || '').includes('fetch failed')) {
    console.error('\n[Network / Supabase Paused Error]');
    console.error(
      `Could not reach ${SUPABASE_URL} (${causeCode || err.message}).`
    );
    console.error(
      'Check your internet connection or verify that your Supabase project is active (Restore project in Supabase Dashboard if paused).'
    );
  } else {
    console.error('\n[Backup Failed]:', err.message || err);
  }
  process.exit(1);
});
