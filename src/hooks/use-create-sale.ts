import { createSale } from "@/services/sales";

export function useCreateSale() {
  const handleCreateSale = async (payload: {
    p_club_id: string;
    p_seller_id: string;
    p_customer_id?: string;
    p_items: any[];
    p_payments: any[];
  }) => {
    return await createSale(payload);
  };

  return { handleCreateSale };
}