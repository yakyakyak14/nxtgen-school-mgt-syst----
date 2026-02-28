import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';

const SchoolLocationMap: React.FC = () => {
  const { data: settings, isLoading } = useSchoolSettings();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="aspect-video bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const hasCoordinates = settings?.school_latitude && settings?.school_longitude;
  const hasEmbedUrl = settings?.google_maps_embed_url;

  if (!hasCoordinates && !hasEmbedUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            School Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center text-center p-6">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Map not configured. Add your school coordinates or Google Maps embed URL in Settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build satellite/aerial view embed URL from coordinates if available
  const mapSrc = hasCoordinates
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${settings.school_latitude},${settings.school_longitude}&maptype=satellite&zoom=18`
    : settings!.google_maps_embed_url!;

  const mapsLink = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${settings.school_latitude},${settings.school_longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings!.school_address || settings!.school_name)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            School Location
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a 
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Maps
            </a>
          </Button>
        </div>
        {settings?.school_address && (
          <p className="text-sm text-muted-foreground">{settings.school_address}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="aspect-video rounded-lg overflow-hidden border">
          <iframe
            src={mapSrc}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="School Location Map"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolLocationMap;
