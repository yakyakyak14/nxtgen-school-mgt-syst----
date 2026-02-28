const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Google Maps API key not configured',
          predictions: [] 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, type, placeId } = await req.json();

    if (type === 'autocomplete') {
      // Places Autocomplete API
      if (!query || query.length < 3) {
        return new Response(
          JSON.stringify({ success: true, predictions: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Searching places for:', query);

      const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
      url.searchParams.set('input', query);
      url.searchParams.set('key', googleMapsApiKey);
      url.searchParams.set('components', 'country:ng'); // Restrict to Nigeria
      url.searchParams.set('types', 'address');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        console.log(`Found ${data.predictions?.length || 0} predictions`);
        return new Response(
          JSON.stringify({
            success: true,
            predictions: data.predictions || [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error('Google Places API error:', data.status, data.error_message);
        return new Response(
          JSON.stringify({
            success: false,
            error: data.error_message || data.status,
            predictions: [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (type === 'details' && placeId) {
      // Place Details API for getting coordinates
      console.log('Getting place details for:', placeId);

      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('key', googleMapsApiKey);
      url.searchParams.set('fields', 'geometry,formatted_address,name');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === 'OK') {
        const result = data.result;
        return new Response(
          JSON.stringify({
            success: true,
            details: {
              formatted_address: result.formatted_address,
              name: result.name,
              lat: result.geometry?.location?.lat,
              lng: result.geometry?.location?.lng,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error('Google Places Details API error:', data.status);
        return new Response(
          JSON.stringify({
            success: false,
            error: data.error_message || data.status,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in google-places function:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
