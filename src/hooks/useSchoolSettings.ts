import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolSettings {
  id: string;
  school_name: string;
  school_motto: string | null;
  school_address: string | null;
  school_phone: string | null;
  school_email: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  google_maps_embed_url: string | null;
  school_latitude: number | null;
  school_longitude: number | null;
  current_session: string;
  current_term: 'first' | 'second' | 'third';
}

export const useSchoolSettings = () => {
  return useQuery({
    queryKey: ['school-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as SchoolSettings | null;
    },
  });
};

export const useUpdateSchoolSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<SchoolSettings>) => {
      const { data: existing } = await supabase
        .from('school_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('school_settings')
          .update(settings)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('school_settings')
          .insert(settings)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
    },
  });
};
