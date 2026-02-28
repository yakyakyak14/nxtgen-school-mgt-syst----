import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Plus, Users } from 'lucide-react';

const mockClubs = [
  { id: 1, name: 'Debate Club', members: 25, patron: 'Mrs. Grace Obi' },
  { id: 2, name: 'Science Club', members: 32, patron: 'Mr. Johnson Adekunle' },
  { id: 3, name: 'Drama Club', members: 28, patron: 'Mrs. Blessing Nwankwo' },
  { id: 4, name: 'Press Club', members: 18, patron: 'Mr. Ahmed Sani' },
  { id: 5, name: 'Red Cross Society', members: 40, patron: 'Mrs. Fatima Yusuf' },
  { id: 6, name: 'Football Club', members: 35, patron: 'Mr. Ibrahim Musa' },
];

const Clubs: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">School Clubs</h1>
          <p className="page-subtitle">Manage extra-curricular activities</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Club
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClubs.map((club) => (
          <Card key={club.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">{club.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{club.patron}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{club.members} members</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Clubs;
