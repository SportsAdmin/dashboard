import { createSale } from "@/services/sales";

export function useCreateSale() {
  const handleCreateSale = async (payload) => {
    return await createSale(payload);
  };

  return { handleCreateSale };
}