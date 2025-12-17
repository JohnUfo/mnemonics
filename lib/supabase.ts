import { createClient } from '@supabase/supabase-js';

// Configuration from your provided details
const supabaseUrl = 'https://gjnkvbfrpceafcfjegoj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqbmt2YmZycGNlYWZjZmplZ29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzQzMjgsImV4cCI6MjA4MTU1MDMyOH0.iteD6_-y8cw8TUC9NoEBnqd7eFZqNaelr5MEJpk5duE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);