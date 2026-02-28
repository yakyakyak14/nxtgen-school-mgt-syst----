import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, Search, Filter, Download, MoreHorizontal, Building2, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import StaffForm from '@/components/staff/StaffForm';
import StaffBankDetails from '@/components/staff/StaffBankDetails';

interface StaffMember {
  id: string;
  staff_id: string;
  user_id: string;
  category: string;
  is_active: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  profiles?: { first_name: string | null; last_name: string | null };
  job_titles?: { title: string };
}

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  useEffect(() => { fetchStaff(); }, []);

  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select(`*, job_titles(title)`).order('staff_id');
    if (data) setStaff(data as StaffMember[]);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Manage teaching and non-teaching staff</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
          <StaffForm onSuccess={fetchStaff} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="search-input flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search staff by name or ID..."
                className="border-0 bg-transparent h-8 focus-visible:ring-0"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : staff.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No staff found</TableCell></TableRow>
                ) : (
                  staff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.staff_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                            <UserCog className="h-4 w-4 text-secondary" />
                          </div>
                          {s.profiles?.first_name} {s.profiles?.last_name}
                        </div>
                      </TableCell>
                      <TableCell>{s.job_titles?.title || 'N/A'}</TableCell>
                      <TableCell>{s.category === 'academic' ? 'Academic' : 'Non-Academic'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {s.bank_account_number ? (
                            <Badge variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              Bank Added
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">No Bank</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSelectedStaff(s)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Bank Details - {s.profiles?.first_name} {s.profiles?.last_name}</DialogTitle>
                              </DialogHeader>
                              <StaffBankDetails staffId={s.id} onUpdate={fetchStaff} />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Staff;
