#!/usr/bin/env node
/**
 * Root convenience entrypoint for Yomi-AI Local Backup.
 * Delegates directly to `yomi-backend/scripts/backup_yomi_data.js` so `dotenv`
 * and `@supabase/supabase-js` resolve cleanly from `yomi-backend/node_modules`.
 */
require('../yomi-backend/scripts/backup_yomi_data');

