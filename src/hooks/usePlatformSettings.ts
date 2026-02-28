import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  id: string;
  platform_name: string;
  platform_logo_url: string | null;
  support_email: string | null;
  support_phone: string | null;
  default_primary_color: string;
  default_secondary_color: string;
  default_accent_color: string;
  max_schools_allowed: number;
  created_at: string;
  updated_at: string;
}

export const usePlatformSettings = () => {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as PlatformSettings | null;
    }
  });
};

export const useUpdatePlatformSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<PlatformSettings>) => {
      // Try to update existing
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('platform_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data as PlatformSettings;
      } else {
        const { data, error } = await supabase
          .from('platform_settings')
          .insert(updates)
          .select()
          .single();

        if (error) throw error;
        return data as PlatformSettings;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    }
  });
};
