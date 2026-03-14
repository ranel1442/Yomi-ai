const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL; // או איך שקראת למשתנה הזה
// כאן הקסם: אנחנו משתמשים במפתח הניהול הסודי!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;