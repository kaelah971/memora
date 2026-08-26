import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type DataClient = SupabaseClient<Database>;

export interface DataAccessStatus {
  available: boolean;
  mode: "service_role" | "authenticated" | "unavailable";
  reason: string | null;
}

export interface DataResult<T> {
  data: T;
  access: DataAccessStatus;
  error: string | null;
}
