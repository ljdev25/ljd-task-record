import { createClient } from "@supabase/supabase-js";

// Only use this in Server Components / API routes — never ship to the browser
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
