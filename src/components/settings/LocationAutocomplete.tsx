import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, placeDetails?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // Nigerian location suggestions (mock data for now - would use Google Places API)
    const nigerianLocations: LocationSuggestion[] = [
      { place_id: '1', description: `${query}, Lagos, Nigeria`, structured_formatting: { main_text: query, secondary_text: 'Lagos, Nigeria' } },
      { place_id: '2', description: `${query}, Abuja, Nigeria`, structured_formatting: { main_text: query, secondary_text: 'Abuja, Nigeria' } },
      { place_id: '3', description: `${query}, Port Harcourt, Nigeria`, structured_formatting: { main_text: query, secondary_text: 'Port Harcourt, Nigeria' } },
      { place_id: '4', description: `${query}, Ibadan, Nigeria`, structured_formatting: { main_text: query, secondary_text: 'Ibadan, Nigeria' } },
      { place_id: '5', description: `${query}, Kano, Nigeria`, structured_formatting: { main_text: query, secondary_text: 'Kano, Nigeria' } },
      { place_id: '6', description: `${query}, Enugu, Nigeria`, structured_formatting: { main_text: query, secondary_text: 'Enugu, Nigeria' } },
      { place_id: '7', description: `${query}, Benin City, Nigeria`, structured_formatting: { main_text: query, secondary_text: 'Benin City, Nigeria' } },
      { place_id: '8', description: `${query}, Calabar, Nigeria`, structured_formatting: { main_text: query, secondary_text: 'Calabar, Nigeria' } },
    ];

    setSuggestions(nigerianLocations);
    setIsLoading(false);
    setShowSuggestions(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
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
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-accent flex items-start gap-3 transition-colors"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">{suggestion.structured_formatting.main_text}</p>
                <p className="text-xs text-muted-foreground">{suggestion.structured_formatting.secondary_text}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
