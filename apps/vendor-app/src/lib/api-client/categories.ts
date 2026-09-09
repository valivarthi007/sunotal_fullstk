import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface CategoryItem {
  id: number;
  name: string;
  icon?: string | null;
}

export const getListCategoriesQueryKey = () => ["/api/categories"] as const;

export function useListCategories() {
  return useQuery<CategoryItem[]>({
    queryKey: getListCategoriesQueryKey(),
    queryFn: async () => {
      return customFetch<CategoryItem[]>("/api/categories");
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; icon?: string }) => {
      const adminToken = localStorage.getItem("sunotal_admin_token");
      return customFetch<CategoryItem>("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const adminToken = localStorage.getItem("sunotal_admin_token");
      return customFetch<void>(`/api/categories/${id}`, {
        method: "DELETE",
        headers: {
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    },
  });
}
