import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCreateSchool, generateSlug } from '@/hooks/useSchools';
import { supabase } from '@/integrations/supabase/client';
import {
  School,
  Palette,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Sparkles
} from 'lucide-react';

interface SchoolSetupWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'basic', title: 'School Info', icon: School },
  { id: 'branding', title: 'Branding', icon: Palette },
  { id: 'contact', title: 'Contact', icon: Phone },
  { id: 'complete', title: 'Complete', icon: CheckCircle2 },
];

const SchoolSetupWizard: React.FC<SchoolSetupWizardProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const createSchool = useCreateSchool();

  const [formData, setFormData] = useState({
    name: '',
    motto: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
    primary_color: '#1e3a5f',
    secondary_color: '#2d5a87',
    accent_color: '#f59e0b',
    current_session: '2024/2025',
    current_term: 'first' as 'first' | 'second' | 'third',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `school-logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('school-assets')
      .upload(filePath, logoFile);

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('school-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      let logoUrl = formData.logo_url;

      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Create the school record
      await createSchool.mutateAsync({
        name: formData.name,
        slug: generateSlug(formData.name),
        domain: null,
        subdomain: null,
        logo_url: logoUrl || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        accent_color: formData.accent_color,
        motto: formData.motto || null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        google_maps_embed_url: null,
        latitude: null,
        longitude: null,
        current_session: formData.current_session,
        current_term: formData.current_term,
      });

      toast({
        title: 'Setup Complete!',
        description: 'Your school has been configured successfully.',
      });

      onComplete();
    } catch (error) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup Error',
        description: 'There was an error saving your settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-8">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Welcome to EduManager Pro
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
              Let's set up your school in just a few steps. This will only take a few minutes.
            </p>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={nextStep} className="w-full max-w-sm mx-auto">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
                Skip for now
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Lagos Model College"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motto">School Motto</Label>
              <Input
                id="motto"
                name="motto"
                value={formData.motto}
                onChange={handleInputChange}
                placeholder="e.g., Excellence Through Knowledge"
                className="h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_session">Current Session</Label>
                <Input
                  id="current_session"
                  name="current_session"
                  value={formData.current_session}
                  onChange={handleInputChange}
                  placeholder="2024/2025"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_term">Current Term</Label>
                <select
                  id="current_term"
                  name="current_term"
                  value={formData.current_term}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_term: e.target.value as 'first' | 'second' | 'third' }))}
                  className="w-full h-12 px-3 rounded-md border border-input bg-background text-foreground"
                >
                  <option value="first">First Term</option>
                  <option value="second">Second Term</option>
                  <option value="third">Third Term</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>School Logo</Label>
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="h-12"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    PNG, JPG up to 2MB. Recommended: 200x200px
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primary_color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleInputChange}
                    className="h-12 w-16 rounded-md border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={handleInputChange}
                    name="primary_color"
                    className="h-12 flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondary_color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleInputChange}
                    className="h-12 w-16 rounded-md border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={handleInputChange}
                    name="secondary_color"
                    className="h-12 flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent_color">Accent Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="accent_color"
                    name="accent_color"
                    value={formData.accent_color}
                    onChange={handleInputChange}
                    className="h-12 w-16 rounded-md border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.accent_color}
                    onChange={handleInputChange}
                    name="accent_color"
                    className="h-12 flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/50">
              <p className="text-sm font-medium mb-3">Preview</p>
              <div className="flex gap-3">
                <div
                  className="h-12 w-12 rounded-lg"
                  style={{ backgroundColor: formData.primary_color }}
                />
                <div
                  className="h-12 w-12 rounded-lg"
                  style={{ backgroundColor: formData.secondary_color }}
                />
                <div
                  className="h-12 w-12 rounded-lg"
                  style={{ backgroundColor: formData.accent_color }}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address">School Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your school's full address"
                  className="pl-10 min-h-[100px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+234 xxx xxx xxxx"
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="info@yourschool.edu.ng"
                    className="h-12 pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center py-8">
            <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              You're All Set!
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
              Your school profile is ready. You can always update these settings later from the Settings page.
            </p>

            <div className="bg-muted/50 rounded-xl p-6 max-w-md mx-auto mb-8 text-left">
              <h3 className="font-semibold mb-4">Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">School Name:</dt>
                  <dd className="font-medium">{formData.name || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Session:</dt>
                  <dd className="font-medium">{formData.current_session}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Term:</dt>
                  <dd className="font-medium capitalize">{formData.current_term} Term</dd>
                </div>
              </dl>
            </div>

            <Button
              size="lg"
              onClick={handleComplete}
              disabled={isLoading || !formData.name}
              className="w-full max-w-sm"
            >
              {isLoading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors ${
                    index <= currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-colors ${
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
          <CardDescription>
            Step {currentStep + 1} of {steps.length}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {renderStepContent()}

          {currentStep > 0 && currentStep < steps.length - 1 && (
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={nextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolSetupWizard;
