import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  Wallet, 
  BarChart3,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Heart,
  Award,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Sparkles,
  BookOpenCheck,
  UserCircle,
  School
} from 'lucide-react';
import { useCurrentSchool } from '@/hooks/useSchools';
import SchoolSetupWizard from '@/components/setup/SchoolSetupWizard';
import NewsSection from '@/components/landing/NewsSection';
import heroBackground from '@/assets/hero-background.jpg';

const features = [
  {
    icon: GraduationCap,
    title: 'Student Management',
    description: 'Comprehensive student profiles from Nursery to SS3 with academic tracking.',
  },
  {
    icon: Users,
    title: 'Staff Administration',
    description: 'Manage teaching and non-teaching staff with roles, payroll, and performance.',
  },
  {
    icon: BookOpen,
    title: 'Academic Excellence',
    description: 'Gradebook with Nigerian curriculum support (WAEC, NECO standards).',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Automated timetable generation and exam scheduling with conflict detection.',
  },
  {
    icon: Wallet,
    title: 'Financial Management',
    description: 'Track fees, payments, installments, and generate receipts seamlessly.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Real-time insights into school performance and operations.',
  },
];

const portals = [
  {
    id: 'staff',
    title: 'Staff Portal',
    subtitle: 'Teachers & Administrators',
    description: 'Access grades, attendance, timetables, and administrative tools.',
    icon: Briefcase,
    features: ['Gradebook Management', 'Attendance Tracking', 'Report Generation', 'AI Teaching Assistant'],
    className: 'portal-card-staff',
    delay: 'stagger-1',
  },
  {
    id: 'parent',
    title: 'Parents Portal',
    subtitle: 'Parents & Guardians',
    description: "Monitor your child's progress, fees, and communicate with teachers.",
    icon: Heart,
    features: ['Academic Progress', 'Fee Payments', 'Weekly Reports', 'Direct Messaging'],
    className: 'portal-card-parent',
    delay: 'stagger-2',
  },
  {
    id: 'alumni',
    title: 'Alumni Portal',
    subtitle: 'Graduates & Former Students',
    description: 'Stay connected, network, and contribute to your alma mater.',
    icon: Award,
    features: ['Alumni Network', 'Donations', 'Events Calendar', 'Crowdfunding Projects'],
    className: 'portal-card-alumni',
    delay: 'stagger-3',
  },
  {
    id: 'super_admin',
    title: 'Super Admin',
    subtitle: 'Platform Administrator',
    description: 'Manage all schools, users, billing, and platform-wide settings.',
    icon: Shield,
    features: ['School Management', 'Director Onboarding', 'Platform Analytics', 'User & Role Control'],
    className: 'portal-card-admin',
    delay: 'stagger-4',
  },
];

const stats = [
  { value: '15', label: 'Class Levels', suffix: '' },
  { value: '100', label: 'Features', suffix: '+' },
  { value: '99.9', label: 'Uptime', suffix: '%' },
  { value: '24/7', label: 'Support', suffix: '' },
];

const Index: React.FC = () => {
  const { data: school, isLoading: schoolLoading } = useCurrentSchool();
  const [isVisible, setIsVisible] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Map school data to settings format for backwards compatibility
  const settings = school ? {
    school_name: school.name,
    school_motto: school.motto,
    school_address: school.address,
    school_phone: school.phone,
    school_email: school.email,
    logo_url: school.logo_url,
    primary_color: school.primary_color,
    secondary_color: school.secondary_color,
    accent_color: school.accent_color,
    current_session: school.current_session,
    current_term: school.current_term,
    google_maps_embed_url: school.google_maps_embed_url,
  } : null;

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    // Show setup wizard if no school exists
    if (!schoolLoading && !school) {
      const hasSkippedSetup = localStorage.getItem('setup-wizard-skipped');
      if (!hasSkippedSetup) {
        setShowSetupWizard(true);
      }
    }
  }, [school, schoolLoading]);

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
  };

  const handleSetupSkip = () => {
    localStorage.setItem('setup-wizard-skipped', 'true');
    setShowSetupWizard(false);
  };

  if (showSetupWizard) {
    return <SchoolSetupWizard onComplete={handleSetupComplete} onSkip={handleSetupSkip} />;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-10 text-sm">
            <div className="hidden md:flex items-center gap-6">
              <Link to="/auth?portal=staff" className="nav-top-link text-primary-foreground/80 hover:text-accent">
                Staff
              </Link>
              <Link to="/auth?portal=parent" className="nav-top-link text-primary-foreground/80 hover:text-accent">
                Parents
              </Link>
              <Link to="/auth?portal=alumni" className="nav-top-link text-primary-foreground/80 hover:text-accent">
                Alumni
              </Link>
              <Link to="/auth?portal=super_admin" className="nav-top-link text-primary-foreground/80 hover:text-accent flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Super Admin
              </Link>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              {settings?.school_phone && (
                <a href={`tel:${settings.school_phone}`} className="flex items-center gap-1 text-primary-foreground/80 hover:text-accent transition-colors">
                  <Phone className="h-3 w-3" />
                  <span className="hidden sm:inline">{settings.school_phone}</span>
                </a>
              )}
              {settings?.school_email && (
                <a href={`mailto:${settings.school_email}`} className="flex items-center gap-1 text-primary-foreground/80 hover:text-accent transition-colors">
                  <Mail className="h-3 w-3" />
                  <span className="hidden sm:inline">{settings.school_email}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt={settings.school_name} 
                className="h-14 w-14 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <School className="h-8 w-8 text-primary-foreground" />
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="font-display text-xl font-bold text-foreground leading-tight">
                {settings?.school_name || 'EduManager Pro'}
              </h1>
              {settings?.school_motto && (
                <p className="text-xs text-muted-foreground italic">{settings.school_motto}</p>
              )}
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
              Features
            </a>
            <a href="#portals" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
              Portals
            </a>
            <a href="#about" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
              About
            </a>
            <a href="#contact" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/auth" className="flex items-center gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Background Image */}
      <section className="relative min-h-[90vh] overflow-hidden text-primary-foreground">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/85 to-secondary/80" />
        </div>

        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="floating-shape bg-accent/30 w-64 h-64 -top-32 -right-32 animate-float" style={{ animationDelay: '0s' }} />
          <div className="floating-shape bg-secondary/30 w-96 h-96 -bottom-48 -left-48 animate-float" style={{ animationDelay: '2s' }} />
          <div className="floating-shape bg-primary-foreground/10 w-48 h-48 top-1/2 right-1/4 animate-float" style={{ animationDelay: '4s' }} />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/20 text-accent mb-8 animate-fade-in ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Built for Nigerian Schools</span>
            </div>

            <h1 className={`font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-slide-up ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
              Empowering 
              <span className="text-accent block sm:inline"> Education</span>
              <br />
              <span className="text-primary-foreground/90">Across Nigeria</span>
            </h1>

            <p className={`text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto animate-slide-up ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
              A comprehensive school management system designed for Nigerian educational institutions. 
              From Nursery to Senior Secondary, manage everything in one place.
            </p>

            <div className={`flex flex-col sm:flex-row gap-4 justify-center animate-slide-up ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
              <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow text-lg px-8 py-6 rounded-xl">
                <Link to="/auth" className="flex items-center gap-2">
                  Access Portal
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8 py-6 rounded-xl">
                <a href="#features">
                  Explore Features
                </a>
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto animate-fade-in ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.8s' }}>
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className="text-center p-6 rounded-2xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 hover:bg-primary-foreground/10 transition-all duration-300"
              >
                <p className="text-3xl md:text-4xl font-bold text-accent">
                  {stat.value}{stat.suffix}
                </p>
                <p className="text-primary-foreground/70 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Portals Section */}
      <section id="portals" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <UserCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Access Portals</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Choose Your Portal
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dedicated portals for staff, parents, and alumni with tailored features for each user type.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {portals.map((portal) => (
              <Link
                key={portal.id}
                to={`/auth?portal=${portal.id}`}
                className={`portal-card ${portal.className} animate-slide-up ${portal.delay}`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <portal.icon className="w-full h-full" />
                </div>
                
                <div className="relative z-10">
                  <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                    <portal.icon className="h-8 w-8" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-1">{portal.title}</h3>
                  <p className="text-sm opacity-80 mb-4">{portal.subtitle}</p>
                  <p className="opacity-90 mb-6">{portal.description}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {portal.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm opacity-90">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="flex items-center gap-2 font-semibold">
                    Enter Portal
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* News & Announcements Section */}
      <NewsSection />

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-4">
              <BookOpenCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Comprehensive Tools</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete suite of tools designed specifically for Nigerian educational institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className={`feature-card animate-slide-up stagger-${index + 1}`}
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium">About Our System</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Designed for Nigerian Excellence
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our school management system is built from the ground up to support the Nigerian 
                educational curriculum and administrative requirements. Every feature is tailored 
                to meet the unique needs of schools across Nigeria.
              </p>
              
              <ul className="space-y-4">
                {[
                  'Nigerian curriculum support (WAEC, NECO standards)',
                  'Multi-level class support (Nursery to SS3)',
                  'Role-based access for staff, parents, and students',
                  'Integrated payment processing with Paystack',
                  'AI-powered teaching assistant (WYN-Tech AI)',
                  'Comprehensive reporting and analytics',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary via-secondary to-primary rounded-3xl p-10 text-primary-foreground shadow-2xl">
                <Globe className="h-14 w-14 mb-8 text-accent" />
                <h3 className="text-3xl font-bold mb-4">
                  Access Anywhere, Anytime
                </h3>
                <p className="text-primary-foreground/80 mb-8 text-lg">
                  Cloud-based system accessible from any device. Monitor your school 
                  operations from anywhere in the world.
                </p>
                
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Web', desc: 'Browser' },
                    { label: 'Mobile', desc: 'Responsive' },
                    { label: 'Tablet', desc: 'Optimized' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className="text-2xl font-bold text-accent">{item.label}</p>
                      <p className="text-sm text-primary-foreground/70">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your School?
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Join educational institutions across Nigeria using our comprehensive 
            school management system to streamline operations.
          </p>
          
          <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow text-lg px-10 py-6 rounded-xl">
            <Link to="/auth" className="flex items-center gap-2">
              Get Started Today
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>

          {settings?.school_address && (
            <div className="mt-12 flex items-center justify-center gap-2 text-primary-foreground/70">
              <MapPin className="h-4 w-4" />
              <span>{settings.school_address}</span>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-foreground text-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                {settings?.logo_url ? (
                  <img 
                    src={settings.logo_url} 
                    alt={settings.school_name} 
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                    <School className="h-6 w-6 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{settings?.school_name || 'EduManager Pro'}</h3>
                  {settings?.school_motto && (
                    <p className="text-sm text-background/70 italic">{settings.school_motto}</p>
                  )}
                </div>
              </div>
              <p className="text-background/70 max-w-md">
                Comprehensive school management system built for Nigerian educational institutions.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-background/70">
                <li><a href="#features" className="hover:text-accent transition-colors">Features</a></li>
                <li><a href="#portals" className="hover:text-accent transition-colors">Portals</a></li>
                <li><a href="#about" className="hover:text-accent transition-colors">About</a></li>
                <li><Link to="/auth" className="hover:text-accent transition-colors">Sign In</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Portals</h4>
              <ul className="space-y-2 text-background/70">
                <li><Link to="/auth?portal=staff" className="hover:text-accent transition-colors">Staff Portal</Link></li>
                <li><Link to="/auth?portal=parent" className="hover:text-accent transition-colors">Parents Portal</Link></li>
                <li><Link to="/auth?portal=alumni" className="hover:text-accent transition-colors">Alumni Portal</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-background/70">
              © {new Date().getFullYear()} {settings?.school_name || 'EduManager Pro'}. All rights reserved.
            </p>
            <p className="text-sm text-background/50">
              Powered by WYN-Tech Solutions
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;