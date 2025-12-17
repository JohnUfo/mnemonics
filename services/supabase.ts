import { createClient } from '@supabase/supabase-js';

// Project ID derived from connection string: postgres.pebkcvdnrdfbjtcntahm...
const supabaseUrl = 'https://pebkcvdnrdfbjtcntahm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmtjdmRucmRmYmp0Y250YWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODAxMDYsImV4cCI6MjA4MTU1NjEwNn0.TuJxh4q-VjbS--YylTMHNBNeytIyScgVs26KmiSHljo';

export const supabase = createClient(supabaseUrl, supabaseKey);