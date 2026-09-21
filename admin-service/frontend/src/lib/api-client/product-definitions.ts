import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ProductDefinitionItem {
  id: number;
  name: string;
  category: string;
  createdAt: string;
}

export const getListProductDefinitionsQueryKey = () => ["/api/product-definitions"] as const;

export function useListProductDefinitions() {
  return useQuery<ProductDefinitionItem[]>({
    queryKey: getListProductDefinitionsQueryKey(),
    queryFn: async () => {
      return customFetch<ProductDefinitionItem[]>("/api/product-definitions");
    },
  });
}

export function useCreateProductDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; category: string }) => {
      const adminToken = localStorage.getItem("sunotal_admin_token");
      return customFetch<ProductDefinitionItem>("/api/product-definitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListProductDefinitionsQueryKey() });
    },
  });
}

export function useDeleteProductDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const adminToken = localStorage.getItem("sunotal_admin_token");
      return customFetch<void>(`/api/product-definitions/${id}`, {
        method: "DELETE",
        headers: {
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListProductDefinitionsQueryKey() });
    },
  });
}
