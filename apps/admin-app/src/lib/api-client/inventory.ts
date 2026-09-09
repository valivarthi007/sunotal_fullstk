import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { customFetch } from './custom-fetch';
import type { 
  InventoryItem, 
  InventoryInput, 
  InventoryUpdate, 
  ListInventoryParams 
} from './generated/api.schemas';
import type { ErrorResponse } from './generated/api.schemas';
import type { ErrorType } from './custom-fetch';

export const getListInventoryQueryKey = (params?: ListInventoryParams) => {
  return [`/api/inventory`, ...(params ? [params] : [])] as const;
};

export const listInventory = async (params?: ListInventoryParams) => {
  const url = new URL('/api/inventory', 'http://localhost:5000');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return customFetch<InventoryItem[]>(url.pathname + url.search, { method: 'GET' });
};

export function useListInventory(
  params?: ListInventoryParams,
  options?: Omit<UseQueryOptions<InventoryItem[], ErrorType<ErrorResponse>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: getListInventoryQueryKey(params),
    queryFn: () => listInventory(params),
    ...options,
  });
}

export const createInventory = async (data: InventoryInput) => {
  return customFetch<InventoryItem>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export function useCreateInventory(
  options?: Omit<UseMutationOptions<InventoryItem, ErrorType<ErrorResponse>, InventoryInput>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: createInventory,
    ...options,
  });
}

export const updateInventory = async ({ id, data }: { id: number; data: InventoryUpdate }) => {
  return customFetch<InventoryItem>(`/api/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export function useUpdateInventory(
  options?: Omit<UseMutationOptions<InventoryItem, ErrorType<ErrorResponse>, { id: number; data: InventoryUpdate }>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: updateInventory,
    ...options,
  });
}

export const deleteInventory = async (id: number) => {
  return customFetch<void>(`/api/inventory/${id}`, { method: 'DELETE' });
};

export function useDeleteInventory(
  options?: Omit<UseMutationOptions<void, ErrorType<ErrorResponse>, number>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: deleteInventory,
    ...options,
  });
}
