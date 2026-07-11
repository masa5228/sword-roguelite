// Supabase setup is performed by the owner later.
// Fill these public anon values after creating the Supabase project.
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

export const RANKING_ENABLED = SUPABASE_URL.trim() !== "" && SUPABASE_ANON_KEY.trim() !== "";
