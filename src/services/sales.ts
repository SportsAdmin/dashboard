// src/services/sales.ts

import { supabase } from "@/lib/supabase";

export async function createSale(payload: {
  p_club_id: string;
  p_seller_id: string;
  p_customer_id?: string;
  p_items: any[];
  p_payments: any[];
}) {
  const { data, error } = await supabase.rpc("create_sale", payload as any);

  if (error) {
    console.error("Error creating sale:", error);
    throw error;
  }

  return data;
}