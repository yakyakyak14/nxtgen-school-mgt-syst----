import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIAssistant from '@/components/ai/AIAssistant';
import DonationDialog from '@/components/donations/DonationDialog';
import AddChildDialog from '@/components/parents/AddChildDialog';
import ChildPerformanceCard from '@/components/parents/ChildPerformanceCard';
import { useParentChildren } from '@/hooks/useParentChildren';

const ParentsPortal: React.FC = () => {
  const { user } = useAuth();
  const { children, isLoading, refetch } = useParentChildren(user?.id);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Floating Donate Button */}
      <div className="fixed top-20 right-6 z-40">
        <DonationDialog
          trigger={
            <Button variant="default" size="lg" className="shadow-lg rounded-full gap-2">
              <Gift className="h-5 w-5" />
              Donate
            </Button>
          }
          context="parent"
        />
      </div>

      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title">Parents Portal</h1>
            <p className="page-subtitle">Monitor your children's academic progress, reports, and fees</p>
          </div>
        </div>
        <AddChildDialog onSuccess={refetch} />
      </div>

      <Tabs defaultValue="children" className="space-y-6">
        <TabsList>
          <TabsTrigger value="children">My Children</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="children">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading your children's information...
              </CardContent>
            </Card>
          ) : children.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="font-medium text-foreground">No children linked yet</p>
                  <p className="text-sm text-muted-foreground">
                    Use the "Add Child/Ward" button to link your children using their school registration number.
                  </p>
                </div>
                <AddChildDialog onSuccess={refetch} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {children.map((child) => (
                <ChildPerformanceCard key={child.id} child={child} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="donations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Support Your School</CardTitle>
                <CardDescription>
                  Help fund school improvements, scholarships, and special projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your donations directly support the school community — from building new facilities 
                  to funding scholarships for students in need.
                </p>
                <DonationDialog
                  trigger={
                    <Button size="lg" className="w-full">
                      <Gift className="h-5 w-5 mr-2" />
                      Make a Donation
                    </Button>
                  }
                  context="parent"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Why Donate?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { icon: '🏫', text: 'Improve school infrastructure and facilities' },
                    { icon: '📚', text: 'Fund scholarships for deserving students' },
                    { icon: '💻', text: 'Support technology upgrades in classrooms' },
                    { icon: '🏆', text: 'Sponsor sports and extracurricular activities' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="text-xl">{item.icon}</span>
                      <p className="text-sm">{item.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assistant">
          <AIAssistant context="parents" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParentsPortal;
