import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface School {
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
  current_session: string | null;
  current_term: 'first' | 'second' | 'third' | null;
}

export const useSchoolContext = () => {
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const detectSchool = async () => {
      try {
        setIsLoading(true);
        
        // Get current hostname
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        // Try to find school by subdomain or domain
        let query = supabase
          .from('schools')
          .select('*')
          .eq('is_active', true);

        // Check if it's a custom domain or subdomain
        if (hostname !== 'localhost' && !hostname.includes('lovable.app')) {
          // Try to match by full domain first
          const { data: domainSchool } = await supabase
            .from('schools')
            .select('*')
            .eq('domain', hostname)
            .eq('is_active', true)
            .maybeSingle();

          if (domainSchool) {
            setSchool(domainSchool);
            setIsLoading(false);
            return;
          }

          // Try to match by subdomain
          const { data: subdomainSchool } = await supabase
            .from('schools')
            .select('*')
            .eq('subdomain', subdomain)
            .eq('is_active', true)
            .maybeSingle();

          if (subdomainSchool) {
            setSchool(subdomainSchool);
            setIsLoading(false);
            return;
          }
        }

        // Check URL path for school slug (e.g., /school/schoolname)
        const pathParts = window.location.pathname.split('/');
        if (pathParts[1] === 'school' && pathParts[2]) {
          const { data: slugSchool } = await supabase
            .from('schools')
            .select('*')
            .eq('slug', pathParts[2])
            .eq('is_active', true)
            .maybeSingle();

          if (slugSchool) {
            setSchool(slugSchool);
            setIsLoading(false);
            return;
          }
        }

        // Default: get the first school (for single-tenant installations)
        const { data: defaultSchool, error: defaultError } = await supabase
          .from('schools')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (defaultError) throw defaultError;
        setSchool(defaultSchool);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to detect school'));
      } finally {
        setIsLoading(false);
      }
    };

    detectSchool();
  }, []);

  return { school, isLoading, error };
};
