import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Palette, Type, Image, Globe, Building2, Save, RefreshCw } from "lucide-react";

interface School {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  subdomain: string | null;
  domain: string | null;
}

const DEFAULT_COLORS = {
  primary: "#1e40af",
  secondary: "#7c3aed",
  accent: "#f59e0b",
};

export function WhiteLabelSettings() {
  const queryClient = useQueryClient();
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [brandingSettings, setBrandingSettings] = useState({
    primary_color: DEFAULT_COLORS.primary,
    secondary_color: DEFAULT_COLORS.secondary,
    accent_color: DEFAULT_COLORS.accent,
    logo_url: "",
    subdomain: "",
    domain: "",
    use_custom_domain: false,
  });

  const { data: schools, isLoading } = useQuery({
    queryKey: ["schools-branding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, slug, primary_color, secondary_color, accent_color, logo_url, subdomain, domain")
        .order("name");
      if (error) throw error;
      return data as School[];
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchool) throw new Error("No school selected");

      const { error } = await supabase
        .from("schools")
        .update({
          primary_color: brandingSettings.primary_color,
          secondary_color: brandingSettings.secondary_color,
          accent_color: brandingSettings.accent_color,
          logo_url: brandingSettings.logo_url || null,
          subdomain: brandingSettings.subdomain || null,
          domain: brandingSettings.use_custom_domain ? brandingSettings.domain : null,
        })
        .eq("id", selectedSchool);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools-branding"] });
      toast.success("Branding settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const savePlatformSettingsMutation = useMutation({
    mutationFn: async (settings: {
      platform_name: string;
      default_primary_color: string;
      default_secondary_color: string;
      default_accent_color: string;
    }) => {
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("platform_settings")
          .update(settings)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_settings")
          .insert(settings);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Platform settings saved");
    },
    onError: () => {
      toast.error("Failed to save platform settings");
    },
  });

  const handleSchoolSelect = (schoolId: string) => {
    setSelectedSchool(schoolId);
    const school = schools?.find(s => s.id === schoolId);
    if (school) {
      setBrandingSettings({
        primary_color: school.primary_color || DEFAULT_COLORS.primary,
        secondary_color: school.secondary_color || DEFAULT_COLORS.secondary,
        accent_color: school.accent_color || DEFAULT_COLORS.accent,
        logo_url: school.logo_url || "",
        subdomain: school.subdomain || school.slug,
        domain: school.domain || "",
        use_custom_domain: !!school.domain,
      });
    }
  };

  const resetToDefaults = () => {
    setBrandingSettings({
      ...brandingSettings,
      primary_color: platformSettings?.default_primary_color || DEFAULT_COLORS.primary,
      secondary_color: platformSettings?.default_secondary_color || DEFAULT_COLORS.secondary,
      accent_color: platformSettings?.default_accent_color || DEFAULT_COLORS.accent,
    });
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-48 bg-muted rounded-lg" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">White-Label Customization</h2>
        <p className="text-muted-foreground">Customize branding for schools and the platform</p>
      </div>

      <Tabs defaultValue="schools" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schools">School Branding</TabsTrigger>
          <TabsTrigger value="platform">Platform Defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="schools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                School Branding
              </CardTitle>
              <CardDescription>Customize colors, logo, and domain for each school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Select School</Label>
                <Select value={selectedSchool} onValueChange={handleSchoolSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a school to customize" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSchool && (
                <>
                  {/* Color Settings */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Primary Color
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={brandingSettings.primary_color}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, primary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={brandingSettings.primary_color}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, primary_color: e.target.value })}
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Secondary Color
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={brandingSettings.secondary_color}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, secondary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={brandingSettings.secondary_color}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, secondary_color: e.target.value })}
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Accent Color
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={brandingSettings.accent_color}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, accent_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={brandingSettings.accent_color}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, accent_color: e.target.value })}
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-4 border rounded-lg">
                    <Label className="mb-2 block">Preview</Label>
                    <div className="flex gap-2">
                      <div
                        className="h-12 flex-1 rounded flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: brandingSettings.primary_color }}
                      >
                        Primary
                      </div>
                      <div
                        className="h-12 flex-1 rounded flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: brandingSettings.secondary_color }}
                      >
                        Secondary
                      </div>
                      <div
                        className="h-12 flex-1 rounded flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: brandingSettings.accent_color }}
                      >
                        Accent
                      </div>
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Logo URL
                    </Label>
                    <Input
                      value={brandingSettings.logo_url}
                      onChange={(e) => setBrandingSettings({ ...brandingSettings, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="mt-1"
                    />
                    {brandingSettings.logo_url && (
                      <div className="mt-2">
                        <img
                          src={brandingSettings.logo_url}
                          alt="Logo preview"
                          className="h-16 object-contain"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      </div>
                    )}
                  </div>

                  {/* Domain Settings */}
                  <div className="space-y-4">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Subdomain
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={brandingSettings.subdomain}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, subdomain: e.target.value })}
                          placeholder="myschool"
                          className="max-w-xs"
                        />
                        <span className="text-muted-foreground">.schoolplatform.com</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={brandingSettings.use_custom_domain}
                        onCheckedChange={(checked) => setBrandingSettings({ ...brandingSettings, use_custom_domain: checked })}
                      />
                      <Label>Use Custom Domain</Label>
                      <Badge variant="secondary">Enterprise</Badge>
                    </div>

                    {brandingSettings.use_custom_domain && (
                      <div>
                        <Label>Custom Domain</Label>
                        <Input
                          value={brandingSettings.domain}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, domain: e.target.value })}
                          placeholder="school.example.com"
                          className="mt-1 max-w-md"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Add a CNAME record pointing to: schools.platform.com
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => saveBrandingMutation.mutate()} disabled={saveBrandingMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {saveBrandingMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={resetToDefaults}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Platform Defaults
              </CardTitle>
              <CardDescription>Set default branding for new schools</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  savePlatformSettingsMutation.mutate({
                    platform_name: formData.get("platform_name") as string,
                    default_primary_color: formData.get("primary") as string,
                    default_secondary_color: formData.get("secondary") as string,
                    default_accent_color: formData.get("accent") as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Platform Name</Label>
                  <Input
                    name="platform_name"
                    defaultValue={platformSettings?.platform_name || "School Management Platform"}
                    className="max-w-md"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Default Primary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        name="primary"
                        defaultValue={platformSettings?.default_primary_color || DEFAULT_COLORS.primary}
                        className="w-12 h-10 p-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Default Secondary Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        name="secondary"
                        defaultValue={platformSettings?.default_secondary_color || DEFAULT_COLORS.secondary}
                        className="w-12 h-10 p-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Default Accent Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        name="accent"
                        defaultValue={platformSettings?.default_accent_color || DEFAULT_COLORS.accent}
                        className="w-12 h-10 p-1"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={savePlatformSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {savePlatformSettingsMutation.isPending ? "Saving..." : "Save Platform Defaults"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
