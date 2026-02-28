import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Mail, Search, Users, Banknote, AlertCircle, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { TERMS } from '@/lib/constants';

interface Defaulter {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  feeType: string;
  feeTypeId: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  parentEmail?: string;
  session: string;
  term: string;
}

const FeeDefaulters = () => {
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDefaulters, setSelectedDefaulters] = useState<string[]>([]);
  const [sendingReminders, setSendingReminders] = useState(false);
  const { data: settings } = useSchoolSettings();

  useEffect(() => {
    fetchDefaulters();
  }, [settings?.current_session]);

  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      // Fetch student fee obligations with balances
      const { data: obligations, error } = await supabase
        .from('student_fee_obligations')
        .select(`
          id,
          student_id,
          fee_type_id,
          session,
          term,
          total_amount,
          amount_paid,
          balance,
          status,
          students!inner (
            id,
            admission_number,
            user_id,
            classes (name)
          ),
          fee_types!inner (
            id,
            name
          )
        `)
        .eq('session', settings?.current_session || '2024/2025')
        .neq('status', 'paid')
        .order('balance', { ascending: false });

      if (error) throw error;

      // Transform data and fetch parent emails
      const defaulterList: Defaulter[] = [];
      
      for (const ob of obligations || []) {
        // Get student profile
        let parentEmail = '';
        if (ob.students?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, first_name, last_name')
            .eq('id', ob.students.user_id)
            .maybeSingle();
          
          parentEmail = profile?.email || '';
          
          defaulterList.push({
            id: ob.id,
            studentId: ob.students.id,
            studentName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ob.students.admission_number,
            admissionNumber: ob.students.admission_number,
            className: ob.students.classes?.name || 'N/A',
            feeType: ob.fee_types?.name || 'N/A',
            feeTypeId: ob.fee_type_id,
            totalAmount: ob.total_amount,
            amountPaid: ob.amount_paid,
            balance: ob.balance,
            status: ob.status,
            parentEmail,
            session: ob.session,
            term: ob.term,
          });
        } else {
          defaulterList.push({
            id: ob.id,
            studentId: ob.students?.id || '',
            studentName: ob.students?.admission_number || 'Unknown',
            admissionNumber: ob.students?.admission_number || '',
            className: ob.students?.classes?.name || 'N/A',
            feeType: ob.fee_types?.name || 'N/A',
            feeTypeId: ob.fee_type_id,
            totalAmount: ob.total_amount,
            amountPaid: ob.amount_paid,
            balance: ob.balance,
            status: ob.status,
            parentEmail: '',
            session: ob.session,
            term: ob.term,
          });
        }
      }

      setDefaulters(defaulterList);
    } catch (error: any) {
      console.error('Error fetching defaulters:', error);
      toast.error('Failed to load fee defaulters');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDefaulters(filteredDefaulters.filter(d => d.parentEmail).map(d => d.id));
    } else {
      setSelectedDefaulters([]);
    }
  };

  const handleSelectDefaulter = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedDefaulters(prev => [...prev, id]);
    } else {
      setSelectedDefaulters(prev => prev.filter(d => d !== id));
    }
  };

  const sendReminders = async () => {
    if (selectedDefaulters.length === 0) {
      toast.error('Please select at least one defaulter');
      return;
    }

    const selectedWithEmail = defaulters.filter(
      d => selectedDefaulters.includes(d.id) && d.parentEmail
    );

    if (selectedWithEmail.length === 0) {
      toast.error('None of the selected defaulters have email addresses');
      return;
    }

    setSendingReminders(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const defaulter of selectedWithEmail) {
        const { error } = await supabase.functions.invoke('send-fee-reminder', {
          body: {
            studentName: defaulter.studentName,
            parentEmail: defaulter.parentEmail,
            admissionNumber: defaulter.admissionNumber,
            className: defaulter.className,
            feeType: defaulter.feeType,
            totalAmount: defaulter.totalAmount,
            amountPaid: defaulter.amountPaid,
            balance: defaulter.balance,
            session: defaulter.session,
            term: defaulter.term,
            schoolInfo: {
              name: settings?.school_name || 'School',
              address: settings?.school_address || '',
              phone: settings?.school_phone || '',
              email: settings?.school_email || '',
              primaryColor: settings?.primary_color,
              logoUrl: settings?.logo_url,
            },
          },
        });

        if (error) {
          console.error('Failed to send reminder:', error);
          failCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Sent ${successCount} reminder(s) successfully`);
      }
      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} reminder(s)`);
      }

      setSelectedDefaulters([]);
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const filteredDefaulters = defaulters.filter(d => {
    const matchesSearch = 
      d.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.className.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTerm = selectedTerm === 'all' || d.term === selectedTerm;
    const matchesStatus = selectedStatus === 'all' || d.status === selectedStatus;
    
    return matchesSearch && matchesTerm && matchesStatus;
  });

  const totalDefaulters = filteredDefaulters.length;
  const totalOutstanding = filteredDefaulters.reduce((sum, d) => sum + d.balance, 0);
  const partialPayments = filteredDefaulters.filter(d => d.status === 'partial').length;
  const pendingPayments = filteredDefaulters.filter(d => d.status === 'pending').length;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              Fee Defaulters Report
            </h1>
            <p className="text-muted-foreground">
              Students with outstanding fee balances for {settings?.current_session || '2024/2025'}
            </p>
          </div>
          <Button 
            onClick={sendReminders} 
            disabled={selectedDefaulters.length === 0 || sendingReminders}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {sendingReminders ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Reminders ({selectedDefaulters.length})
              </>
            )}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Defaulters</p>
                  <p className="text-2xl font-bold">{totalDefaulters}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Banknote className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">₦{totalOutstanding.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Partial Payments</p>
                  <p className="text-2xl font-bold">{partialPayments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No Payment</p>
                  <p className="text-2xl font-bold">{pendingPayments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, admission number, or class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {TERMS.map(term => (
                    <SelectItem key={term.value} value={term.value}>{term.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">No Payment</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Defaulters Table */}
        <Card>
          <CardHeader>
            <CardTitle>Defaulters List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDefaulters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No fee defaulters found</p>
                <p className="text-sm mt-1">All students are up to date with their payments!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedDefaulters.length === filteredDefaulters.filter(d => d.parentEmail).length && filteredDefaulters.filter(d => d.parentEmail).length > 0}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDefaulters.map((defaulter) => (
                      <TableRow key={defaulter.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDefaulters.includes(defaulter.id)}
                            onCheckedChange={(checked) => handleSelectDefaulter(defaulter.id, !!checked)}
                            disabled={!defaulter.parentEmail}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{defaulter.studentName}</p>
                            <p className="text-sm text-muted-foreground">{defaulter.admissionNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>{defaulter.className}</TableCell>
                        <TableCell>{defaulter.feeType}</TableCell>
                        <TableCell className="capitalize">{defaulter.term}</TableCell>
                        <TableCell className="text-right">₦{defaulter.totalAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">₦{defaulter.amountPaid.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">₦{defaulter.balance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={defaulter.status === 'partial' ? 'outline' : 'destructive'}>
                            {defaulter.status === 'partial' ? 'Partial' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {defaulter.parentEmail ? (
                            <Mail className="h-4 w-4 text-green-500" />
                          ) : (
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default FeeDefaulters;