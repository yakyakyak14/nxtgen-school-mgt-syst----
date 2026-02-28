import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search as SearchIcon, GraduationCap, UserCog, School } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Search Results</h1>
          <p className="page-subtitle">
            {query ? `Showing results for "${query}"` : 'Enter a search term to find students, staff, and classes'}
          </p>
        </div>
      </div>

      <div className="search-input max-w-2xl">
        <SearchIcon className="h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search students, staff, classes..."
          defaultValue={query}
          className="border-0 bg-transparent h-10 text-base focus-visible:ring-0"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {query ? (
            <div className="grid gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Adebayo Olamide</p>
                    <p className="text-sm text-muted-foreground">Student • Primary 3A • STU001</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <UserCog className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium">Mr. Johnson Adekunle</p>
                    <p className="text-sm text-muted-foreground">Teacher • Mathematics • STF001</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <School className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Primary 3A</p>
                    <p className="text-sm text-muted-foreground">Class • 38 students • Mr. Johnson</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter a search term to find results</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Student search results will appear here</p>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Staff search results will appear here</p>
          </div>
        </TabsContent>

        <TabsContent value="classes" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            <School className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Class search results will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Search;
