import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Banner {
  id: number;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  active: boolean;
  createdAt: string;
}

const API_BASE = '/api';

export function useListBanners() {
  return useQuery<Banner[]>({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/banners`);
      if (!res.ok) throw new Error('Failed to fetch hero banners');
      return res.json();
    }
  });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; subtitle?: string; imageUrl: string; linkUrl?: string }) => {
      const res = await fetch(`${API_BASE}/banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create hero banner');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    }
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/banners/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete hero banner');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    }
  });
}

export async function uploadImageToS3(file: File, folder = 'images'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            data: base64Data,
            folder
          })
        });
        if (!res.ok) throw new Error('Failed to upload image to S3');
        const json = await res.json();
        resolve(json.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
  });
}
