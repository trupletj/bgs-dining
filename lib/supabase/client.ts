import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { KIOSK_CONFIG_KEYS } from "@/lib/constants";

let supabaseClient: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseClient) return supabaseClient;

  // Env vars take priority, kioskConfig as fallback
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !key) {
    const urlConfig = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.SUPABASE_URL);
    const keyConfig = await db.kioskConfig.get(KIOSK_CONFIG_KEYS.SUPABASE_PUBLISHABLE_KEY);
    url = urlConfig?.value ?? url;
    key = keyConfig?.value ?? key;
  }

  if (!url || !key) {
    throw new Error("Supabase тохиргоо хийгдээгүй байна. .env.local файлд эсвэл Админ → Тохиргоо хэсгээс тохируулна уу.");
  }

  supabaseClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return supabaseClient;
}

export function resetSupabaseClient() {
  supabaseClient = null;
}

/**
 * Test Supabase connection by querying dining_hall count.
 */
export async function testSupabaseConnection(url: string, key: string): Promise<boolean> {
  const client = createClient(url, key, {
    auth: { persistSession: false },
  });
  const { error } = await client.from("dining_hall").select("id", { count: "exact", head: true });
  return !error;
}
