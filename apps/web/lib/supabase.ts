import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types.generated";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type TypedSupabaseClient = SupabaseClient<Database>;

let cachedClient: TypedSupabaseClient | null = null;

function getOptionalClient(): TypedSupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return cachedClient;
}

export function createClient(): TypedSupabaseClient {
  const client = getOptionalClient();
  if (!client) {
    throw new Error("Missing Supabase environment variables");
  }
  return client;
}

export type CardSummary = {
  id: number;
  card_name: string;
  set_name: string;
  image_urls: string | null;
};

export async function fetchSampleCards(limit = 10): Promise<CardSummary[]> {
  const client = getOptionalClient();
  if (!client) {
    return getFallbackCards(limit);
  }

  const { data, error } = await client
    .from("card_jp")
    .select("id, card_name, set_name, image_urls")
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export type FallbackCardRow = CardSummary & {
  card_index?: string | null;
  rarity: string | null;
  set_slug: string | null;
};

export function hasSupabaseCredentials() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getFallbackCardRows(limit = FALLBACK_CARD_ROWS.length) {
  return FALLBACK_CARD_ROWS.slice(0, limit);
}

export function getFallbackCards(limit = FALLBACK_CARD_ROWS.length) {
  return FALLBACK_CARD_ROWS.slice(0, limit).map(({ id, card_name, set_name, image_urls }) => ({
    id,
    card_name,
    set_name,
    image_urls,
  }));
}

const FALLBACK_CARD_ROWS: FallbackCardRow[] = [
  {
    id: 1,
    card_name: "Charizard VMAX HR",
    set_name: "Shiny Star V",
    set_slug: "shiny-star-v",
    rarity: "HR",
    image_urls: "https://images.pokemontcg.io/swsh4/205_hires.png",
  },
  {
    id: 2,
    card_name: "Pikachu 25th Gold",
    set_name: "25th Anniversary",
    set_slug: "25th-anniversary",
    rarity: "UR",
    image_urls: "https://images.pokemontcg.io/smp/145.png",
  },
  {
    id: 3,
    card_name: "Gengar VMAX Alt",
    set_name: "Fusion Arts",
    set_slug: "fusion-arts",
    rarity: "CSR",
    image_urls: "https://images.pokemontcg.io/swsh8/157_hires.png",
  },
  {
    id: 4,
    card_name: "Sylveon VMAX SA",
    set_name: "Eevee Heroes",
    set_slug: "eevee-heroes",
    rarity: "SAR",
    image_urls: "https://images.pokemontcg.io/swsh7/75_hires.png",
  },
  {
    id: 5,
    card_name: "Umbreon VMAX SA",
    set_name: "Evolving Skies",
    set_slug: "evolving-skies",
    rarity: "SAR",
    image_urls: "https://images.pokemontcg.io/swsh7/215_hires.png",
  },
  {
    id: 6,
    card_name: "Rayquaza VMAX HR",
    set_name: "Blue Sky Stream",
    set_slug: "blue-sky-stream",
    rarity: "HR",
    image_urls: "https://images.pokemontcg.io/swsh7/217_hires.png",
  },
  {
    id: 7,
    card_name: "Mewtwo V-Union UR",
    set_name: "VMAX Climax",
    set_slug: "vmax-climax",
    rarity: "UR",
    image_urls: "https://images.pokemontcg.io/swsh8/6_hires.png",
  },
  {
    id: 8,
    card_name: "Lugia V Alt Art",
    set_name: "Paradigm Trigger",
    set_slug: "paradigm-trigger",
    rarity: "SAR",
    image_urls: "https://images.pokemontcg.io/swsh12/186_hires.png",
  },
  {
    id: 9,
    card_name: "Gardevoir ex SAR",
    set_name: "Scarlet ex",
    set_slug: "scarlet-ex",
    rarity: "SAR",
    image_urls: "https://images.pokemontcg.io/sv1/245_hires.png",
  },
  {
    id: 10,
    card_name: "Snorlax CSR",
    set_name: "VMAX Climax",
    set_slug: "vmax-climax",
    rarity: "CSR",
    image_urls: "https://images.pokemontcg.io/swsh8/131_hires.png",
  },
];
