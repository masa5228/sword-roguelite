// Supabase setup is performed by the owner later.
// Fill these public anon values after creating the Supabase project.
export const SUPABASE_URL = "https://esblafpnxlfdoqsptrvs.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzYmxhZnBueGxmZG9xc3B0cnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MzIzNTYsImV4cCI6MjA5OTMwODM1Nn0.S8xYtvlPGTVbdP13WDT99A6dr2iTBeA-V19_RVsfGTQ";

export const RANKING_ENABLED = SUPABASE_URL.trim() !== "" && SUPABASE_ANON_KEY.trim() !== "";
