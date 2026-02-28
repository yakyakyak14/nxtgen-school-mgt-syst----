import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Nigerian cities for fallback suggestions
const NIGERIAN_CITIES = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 
  'Enugu', 'Benin City', 'Calabar', 'Kaduna', 'Jos',
  'Owerri', 'Onitsha', 'Warri', 'Ilorin', 'Abeokuta',
  'Uyo', 'Asaba', 'Akure', 'Ado-Ekiti', 'Sokoto'
];

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useGoogleApi, setUseGoogleApi] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFallbackSuggestions = (query: string): AddressSuggestion[] => {
    const queryLower = query.toLowerCase();
    return NIGERIAN_CITIES
      .filter(city => city.toLowerCase().includes(queryLower) || queryLower.length >= 3)
      .slice(0, 5)
      .map((city, idx) => ({
        place_id: `local_${idx}`,
        description: `${query}, ${city}, Nigeria`,
        main_text: query,
        secondary_text: `${city}, Nigeria`,
      }));
  };

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      if (useGoogleApi) {
        // Try using Google Places API via edge function
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: { query, type: 'autocomplete' }
        });

        if (error) throw error;

        if (data?.success && data?.predictions?.length > 0) {
          setSuggestions(data.predictions.map((p: any) => ({
            place_id: p.place_id,
            description: p.description,
            main_text: p.structured_formatting?.main_text || p.description,
            secondary_text: p.structured_formatting?.secondary_text || '',
          })));
          setShowSuggestions(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (error) {
      console.log('Google Places API not available, using fallback');
      setUseGoogleApi(false);
    }

    // Fallback to local suggestions
    const fallbackSuggestions = getFallbackSuggestions(query);
    setSuggestions(fallbackSuggestions);
    setShowSuggestions(true);
    setIsLoading(false);
  }, [useGoogleApi]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue); // Allow custom input

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.description);
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-accent flex items-start gap-3 transition-colors"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">{suggestion.main_text}</p>
                <p className="text-xs text-muted-foreground">{suggestion.secondary_text}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
