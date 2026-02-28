import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GraduationCap, Loader2, Eye, EyeOff, Users, Briefcase, Award, ArrowLeft, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PortalType = 'staff' | 'parents' | 'alumni' | 'super_admin' | null;

const portalConfig = {
  staff: {
    title: 'Staff Portal',
    description: 'For teachers, administrators, and school staff',
    icon: Briefcase,
    color: 'bg-blue-500',
    roles: ['Director', 'Principal', 'Headmaster', 'Teacher', 'Admin Staff', 'Non-Teaching Staff']
  },
  parents: {
    title: 'Parents/Guardians Portal',
    description: 'Monitor your child\'s academic progress',
    icon: Users,
    color: 'bg-green-500',
    roles: ['Parent', 'Guardian']
  },
  alumni: {
    title: 'Alumni Portal',
    description: 'Stay connected and give back to your alma mater',
    icon: Award,
    color: 'bg-purple-500',
    roles: ['Alumni']
  },
  super_admin: {
    title: 'Super Admin',
    description: 'Platform administration and management',
    icon: Shield,
    color: 'bg-red-600',
    roles: ['Super Admin']
  }
};

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useSchoolSettings();

  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get('portal') as PortalType;
  const isSuperAdmin = portalParam === 'super_admin';
  const [selectedPortal, setSelectedPortal] = useState<PortalType>(isSuperAdmin ? 'super_admin' : null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Signup form state
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupGraduationYear, setSignupGraduationYear] = useState('');
  const [signupGraduationClass, setSignupGraduationClass] = useState('');

  // Parent-specific signup state
  const [parentChildIdentifiers, setParentChildIdentifiers] = useState<string[]>(['']);

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 50 }, (_, i) => currentYear - i);

  // Staff role options for login
  const staffRoleOptions = [
    { value: 'director', label: 'Director' },
    { value: 'principal', label: 'Principal' },
    { value: 'headmaster', label: 'Headmaster' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'admin_staff', label: 'Admin Staff' },
    { value: 'non_teaching_staff', label: 'Non-Teaching Staff' },
  ];

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // For staff portal, require role selection
    if (selectedPortal === 'staff' && !selectedRole) {
      setErrors({ role: 'Please select your role' });
      return;
    }

    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/dashboard');
    }
  };

  const addChildField = () => {
    setParentChildIdentifiers([...parentChildIdentifiers, '']);
  };

  const removeChildField = (index: number) => {
    if (parentChildIdentifiers.length > 1) {
      setParentChildIdentifiers(parentChildIdentifiers.filter((_, i) => i !== index));
    }
  };

  const updateChildIdentifier = (index: number, value: string) => {
    const updated = [...parentChildIdentifiers];
    updated[index] = value;
    setParentChildIdentifiers(updated);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // For alumni portal, require graduation year
    if (selectedPortal === 'alumni' && !signupGraduationYear) {
      setErrors({ graduationYear: 'Please select your graduation year' });
      return;
    }

    // For parents portal, require at least one child identifier
    if (selectedPortal === 'parents') {
      const validIds = parentChildIdentifiers.filter(id => id.trim() !== '');
      if (validIds.length === 0) {
        setErrors({ childIdentifiers: 'Please enter at least one child\'s registration number' });
        return;
      }
    }

    const validation = signupSchema.safeParse({
      firstName: signupFirstName,
      lastName: signupLastName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, {
      first_name: signupFirstName,
      last_name: signupLastName,
    });

    if (error) {
      setIsLoading(false);
      if (error.message.includes('already registered')) {
        toast({
          variant: 'destructive',
          title: 'Account exists',
          description: 'This email is already registered. Please log in instead.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Signup failed',
          description: error.message,
        });
      }
    } else {
      // If alumni portal, setup alumni profile after signup
      if (selectedPortal === 'alumni') {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            await supabase.rpc('setup_alumni_profile', {
              _user_id: sessionData.session.user.id,
              _graduation_year: parseInt(signupGraduationYear),
              _graduation_class: signupGraduationClass || null,
            });
          }
        } catch (alumniError) {
          console.error('Error setting up alumni profile:', alumniError);
        }
      }

      // If parents portal, setup parent profile and link children
      if (selectedPortal === 'parents') {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const validIds = parentChildIdentifiers.filter(id => id.trim() !== '');
            await supabase.rpc('setup_parent_profile', {
              _user_id: sessionData.session.user.id,
              _student_identifiers: validIds,
            });
          }
        } catch (parentError) {
          console.error('Error setting up parent profile:', parentError);
        }
      }

      setIsLoading(false);
      toast({
        title: 'Account created!',
        description: selectedPortal === 'alumni' 
          ? 'Your alumni account has been created. Please check your email to verify your account.'
          : selectedPortal === 'parents'
          ? 'Your parent account has been created. Please check your email to verify your account.'
          : 'Please check your email to verify your account, or contact the administrator to assign your role.',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Portal Selection Screen
  if (!selectedPortal) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 hero-gradient p-12 flex-col justify-between text-primary-foreground">
          <div>
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt={settings.school_name} 
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                  <GraduationCap className="h-7 w-7 text-accent-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {settings?.school_name || 'School Management System'}
                </h1>
                {settings?.school_motto && (
                  <p className="text-primary-foreground/80 text-sm italic">
                    "{settings.school_motto}"
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Empowering Education,<br />
              One Student at a Time
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              A comprehensive school management platform designed for Nigerian schools. 
              Manage students, staff, grades, fees, and more—all in one place.
            </p>
            <div className="flex gap-8 pt-4">
              <div>
                <p className="text-3xl font-bold">1,200+</p>
                <p className="text-primary-foreground/70">Students</p>
              </div>
              <div>
                <p className="text-3xl font-bold">80+</p>
                <p className="text-primary-foreground/70">Staff</p>
              </div>
              <div>
                <p className="text-3xl font-bold">15+</p>
                <p className="text-primary-foreground/70">Classes</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} {settings?.school_name || 'School Management System'}. All rights reserved.
          </p>
        </div>

        {/* Right side - Portal Selection */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
          <div className="w-full max-w-lg">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              {settings?.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt={settings.school_name} 
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                  <GraduationCap className="h-7 w-7 text-primary-foreground" />
                </div>
              )}
              <h1 className="text-xl font-bold text-foreground">
                {settings?.school_name || 'School Management'}
              </h1>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Choose Your Portal</h2>
              <p className="text-muted-foreground">Select the appropriate portal to access the system</p>
            </div>

            <div className="grid gap-4">
              {(Object.entries(portalConfig) as [PortalType, typeof portalConfig.staff][])
                .map(([key, config]) => {
                if (!key) return null;
                const Icon = config.icon;
                return (
                  <Card 
                    key={key}
                    className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary"
                    onClick={() => setSelectedPortal(key)}
                  >
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className={`h-14 w-14 rounded-xl ${config.color} flex items-center justify-center`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login/Signup Screen for selected portal
  const currentPortal = portalConfig[selectedPortal];
  const PortalIcon = currentPortal.icon;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient p-12 flex-col justify-between text-primary-foreground">
        <div>
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt={settings.school_name} 
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-accent-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {settings?.school_name || 'School Management System'}
              </h1>
              {settings?.school_motto && (
                <p className="text-primary-foreground/80 text-sm italic">
                  "{settings.school_motto}"
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`h-20 w-20 rounded-2xl ${currentPortal.color} flex items-center justify-center`}>
            <PortalIcon className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            {currentPortal.title}
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            {currentPortal.description}
          </p>
          <div className="flex flex-wrap gap-2 pt-4">
            {currentPortal.roles.map((role) => (
              <span key={role} className="px-3 py-1 rounded-full bg-white/20 text-sm">
                {role}
              </span>
            ))}
          </div>
        </div>

        <p className="text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} {settings?.school_name || 'School Management System'}. All rights reserved.
        </p>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt={settings.school_name} 
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
            )}
            <h1 className="text-xl font-bold text-foreground">
              {settings?.school_name || 'School Management'}
            </h1>
          </div>

          <Button 
            variant="ghost" 
            className="mb-4" 
            onClick={() => isSuperAdmin ? navigate('/') : setSelectedPortal(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isSuperAdmin ? 'Back to Home' : 'Back to Portal Selection'}
          </Button>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className={`h-12 w-12 rounded-xl ${currentPortal.color} flex items-center justify-center mx-auto mb-3`}>
                <PortalIcon className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl">{currentPortal.title}</CardTitle>
              <CardDescription>
                {isSuperAdmin ? 'Sign in with your super admin credentials' : 'Sign in to access the portal'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuperAdmin ? (
                /* Super Admin: Login only, no tabs */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your admin email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Sign In as Super Admin
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    This portal is restricted to authorized platform administrators only.
                  </p>
                </form>
              ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Staff Role Selection */}
                    {selectedPortal === 'staff' && (
                      <div className="space-y-3">
                        <Label>Select Your Role</Label>
                        <RadioGroup
                          value={selectedRole}
                          onValueChange={setSelectedRole}
                          className="grid grid-cols-2 gap-2"
                        >
                          {staffRoleOptions.map((role) => (
                            <div key={role.value} className="flex items-center space-x-2">
                              <RadioGroupItem 
                                value={role.value} 
                                id={role.value}
                                disabled={isLoading}
                              />
                              <Label 
                                htmlFor={role.value} 
                                className="text-sm font-normal cursor-pointer"
                              >
                                {role.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                        {errors.role && (
                          <p className="text-xs text-destructive">{errors.role}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className={errors.email ? 'border-destructive' : ''}
                        disabled={isLoading}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errors.password && (
                        <p className="text-xs text-destructive">{errors.password}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="First name"
                          value={signupFirstName}
                          onChange={(e) => setSignupFirstName(e.target.value)}
                          className={errors.firstName ? 'border-destructive' : ''}
                          disabled={isLoading}
                        />
                        {errors.firstName && (
                          <p className="text-xs text-destructive">{errors.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Last name"
                          value={signupLastName}
                          onChange={(e) => setSignupLastName(e.target.value)}
                          className={errors.lastName ? 'border-destructive' : ''}
                          disabled={isLoading}
                        />
                        {errors.lastName && (
                          <p className="text-xs text-destructive">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className={errors.email ? 'border-destructive' : ''}
                        disabled={isLoading}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className={errors.password ? 'border-destructive' : ''}
                        disabled={isLoading}
                      />
                      {errors.password && (
                        <p className="text-xs text-destructive">{errors.password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        className={errors.confirmPassword ? 'border-destructive' : ''}
                        disabled={isLoading}
                      />
                      {errors.confirmPassword && (
                        <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>

                    {/* Alumni-specific fields */}
                    {selectedPortal === 'alumni' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Graduation Year *</Label>
                          <Select
                            value={signupGraduationYear}
                            onValueChange={setSignupGraduationYear}
                          >
                            <SelectTrigger className={errors.graduationYear ? 'border-destructive' : ''}>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {graduationYears.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.graduationYear && (
                            <p className="text-xs text-destructive">{errors.graduationYear}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Graduation Class</Label>
                          <Input
                            placeholder="e.g., SS3A"
                            value={signupGraduationClass}
                            onChange={(e) => setSignupGraduationClass(e.target.value)}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    )}

                    {/* Parent-specific fields */}
                    {selectedPortal === 'parents' && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Children's Registration Numbers *
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Enter each child's school registration number (e.g., AIS/2026/0001). You can add more children after signing up.
                        </p>
                        {parentChildIdentifiers.map((identifier, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              placeholder={`Child ${index + 1} reg. number`}
                              value={identifier}
                              onChange={(e) => updateChildIdentifier(index, e.target.value)}
                              disabled={isLoading}
                              className={errors.childIdentifiers ? 'border-destructive' : ''}
                            />
                            {parentChildIdentifiers.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeChildField(index)}
                                disabled={isLoading}
                                className="shrink-0"
                              >
                                ✕
                              </Button>
                            )}
                          </div>
                        ))}
                        {errors.childIdentifiers && (
                          <p className="text-xs text-destructive">{errors.childIdentifiers}</p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addChildField}
                          disabled={isLoading}
                        >
                          + Add Another Child
                        </Button>
                      </div>
                    )}

                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      After signing up, contact the school administrator to assign your role.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;