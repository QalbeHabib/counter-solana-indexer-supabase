import { SupabaseClient } from "@supabase/supabase-js";

export interface CounterEvent {
  id?: number;
  signature: string;
  block_time: number;
  slot: number;
  event_type:
    | "CounterInitialized"
    | "CounterIncremented"
    | "CounterDecremented";
  authority: string;
  old_count?: number;
  new_count: number;
  timestamp?: number;
  processed_at: string; // Supabase uses ISO strings for timestamps
}

export class EventModel {
  private supabase: SupabaseClient;
  private tableName = "counter_events";

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async saveEvent(event: CounterEvent): Promise<void> {
    const eventData = {
      ...event,
      processed_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from(this.tableName)
      .insert(eventData);

    if (error) {
      if (error.code === "23505") {
        // PostgreSQL unique constraint violation
        console.log(`Event ${event.signature} already processed`);
      } else {
        throw error;
      }
    }
  }

  async getEventsByAuthority(
    authority: string,
    limit: number = 100
  ): Promise<CounterEvent[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .eq("authority", authority)
      .order("block_time", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getRecentEvents(limit: number = 100): Promise<CounterEvent[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("*")
      .order("block_time", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getCounterState(authority: string): Promise<{ count: number } | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select("new_count")
      .eq("authority", authority)
      .order("block_time", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found
    if (!data) return null;

    return { count: data.new_count };
  }
}
