import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface School {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  subdomain: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  motto: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  google_maps_embed_url: string | null;
  latitude: number | null;
  longitude: number | null;
  current_session: string | null;
  current_term: 'first' | 'second' | 'third' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSchools = (includeInactive = false) => {
  return useQuery({
    queryKey: ['schools', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('schools')
        .select('*')
        .order('name');
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as School[];
    }
  });
};

export const useCurrentSchool = () => {
  return useQuery({
    queryKey: ['current-school'],
    queryFn: async () => {
      // Get the first active school (for single-tenant mode)
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as School | null;
    }
  });
};

export const useCreateSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (school: Omit<School, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('schools')
        .insert({
          name: school.name,
          slug: school.slug,
          domain: school.domain,
          subdomain: school.subdomain,
          logo_url: school.logo_url,
          primary_color: school.primary_color,
          secondary_color: school.secondary_color,
          accent_color: school.accent_color,
          motto: school.motto,
          address: school.address,
          phone: school.phone,
          email: school.email,
          google_maps_embed_url: school.google_maps_embed_url,
          latitude: school.latitude,
          longitude: school.longitude,
          current_session: school.current_session,
          current_term: school.current_term,
        })
        .select()
        .single();

      if (error) throw error;
      return data as School;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['current-school'] });
    }
  });
};

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<School> & { id: string }) => {
      const { data, error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as School;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['current-school'] });
    }
  });
};

// Helper function to generate a URL-friendly slug
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};
