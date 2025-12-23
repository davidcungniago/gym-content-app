import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 👇 PERHATIKAN KATA 'export' DI SINI. INI WAJIB ADA.
export const supabase = createClient(supabaseUrl, supabaseKey)