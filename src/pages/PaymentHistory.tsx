import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Download, Search, Receipt, CreditCard, Calendar, FileArchive, Loader2 } from 'lucide-react';
import { generateReceipt, ReceiptData } from '@/components/fees/ReceiptGenerator';
import { downloadBulkReceipts } from '@/utils/bulkReceiptDownload';
import { toast } from 'sonner';

interface PaymentRecord {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  term: string;
  session: string;
  fee_type: { name: string };
  student: {
    admission_number: string;
    profile: { first_name: string; last_name: string };
    class: { name: string };
  };
}

interface SchoolSettings {
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  logo_url: string | null;
}

const PaymentHistory: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchPayments();
    fetchSchoolSettings();
  }, [user]);

  const fetchSchoolSettings = async () => {
    const { data } = await supabase
      .from('school_settings')
      .select('school_name, school_address, school_phone, school_email, logo_url')
      .limit(1)
      .single();
    
    if (data) {
      setSchoolSettings(data);
    }
  };

  const fetchPayments = async () => {
    if (!user) return;

    try {
      // First, get the guardian's linked students
      const { data: guardianData } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (guardianData) {
        const { data: studentGuardians } = await supabase
          .from('student_guardians')
          .select('student_id')
          .eq('guardian_id', guardianData.id);

        const studentIds = studentGuardians?.map(sg => sg.student_id) || [];

        if (studentIds.length > 0) {
          const { data, error } = await supabase
            .from('fee_payments')
            .select(`
              id,
              amount_paid,
              payment_date,
              payment_method,
              receipt_number,
              term,
              session,
              fee_type:fee_types(name),
              student:students(
                admission_number,
                profile:profiles(first_name, last_name),
                class:classes(name)
              )
            `)
            .in('student_id', studentIds)
            .order('payment_date', { ascending: false });

          if (error) throw error;
          setPayments(data as unknown as PaymentRecord[] || []);
        }
      } else {
        // Not a parent, try to fetch all payments (for staff)
        const { data, error } = await supabase
          .from('fee_payments')
          .select(`
            id,
            amount_paid,
            payment_date,
            payment_method,
            receipt_number,
            term,
            session,
            fee_type:fee_types(name),
            student:students(
              admission_number,
              profile:profiles(first_name, last_name),
              class:classes(name)
            )
          `)
          .order('payment_date', { ascending: false })
          .limit(100);

        if (error) throw error;
        setPayments(data as unknown as PaymentRecord[] || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (payment: PaymentRecord) => {
    if (!schoolSettings) {
      toast.error('School settings not loaded');
      return;
    }

    const studentName = `${payment.student?.profile?.first_name || ''} ${payment.student?.profile?.last_name || ''}`.trim();

    const receiptData: ReceiptData = {
      receiptNumber: payment.receipt_number || `RCP${Date.now().toString(36).toUpperCase()}`,
      studentName: studentName || 'Unknown Student',
      admissionNumber: payment.student?.admission_number || 'N/A',
      className: payment.student?.class?.name || 'N/A',
      feeType: payment.fee_type?.name || 'School Fee',
      amount: payment.amount_paid,
      paymentMethod: payment.payment_method || 'Cash',
      paymentDate: payment.payment_date,
      session: payment.session,
      term: payment.term,
      schoolInfo: {
        name: schoolSettings.school_name,
        address: schoolSettings.school_address || '',
        phone: schoolSettings.school_phone || '',
        email: schoolSettings.school_email || '',
        logoUrl: schoolSettings.logo_url || undefined,
      },
    };

    generateReceipt(receiptData);
    toast.success('Receipt downloaded successfully');
  };

  const handleBulkDownload = async () => {
    if (!schoolSettings) {
      toast.error('School settings not loaded');
      return;
    }

    if (selectedTerm === 'all' || selectedSession === 'all') {
      toast.error('Please select a specific term and session for bulk download');
      return;
    }

    const paymentsToDownload = filteredPayments;
    if (paymentsToDownload.length === 0) {
      toast.error('No payments found for the selected filters');
      return;
    }

    setDownloadingBulk(true);
    setDownloadProgress({ current: 0, total: paymentsToDownload.length });

    try {
      await downloadBulkReceipts(
        paymentsToDownload,
        schoolSettings,
        selectedTerm,
        selectedSession,
        (current, total) => setDownloadProgress({ current, total })
      );
      toast.success(`Downloaded ${paymentsToDownload.length} receipts as ZIP`);
    } catch (error) {
      console.error('Error downloading bulk receipts:', error);
      toast.error('Failed to download receipts');
    } finally {
      setDownloadingBulk(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const filteredPayments = payments.filter(payment => {
    const studentName = `${payment.student?.profile?.first_name || ''} ${payment.student?.profile?.last_name || ''}`.toLowerCase();
    const matchesSearch = studentName.includes(searchTerm.toLowerCase()) ||
      payment.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTerm = selectedTerm === 'all' || payment.term === selectedTerm;
    const matchesSession = selectedSession === 'all' || payment.session === selectedSession;
    return matchesSearch && matchesTerm && matchesSession;
  });

  const uniqueSessions = [...new Set(payments.map(p => p.session))];

  const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount_paid, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment History</h1>
          <p className="page-subtitle">View and download your payment receipts</p>
        </div>
        <Button 
          onClick={handleBulkDownload} 
          disabled={downloadingBulk || selectedTerm === 'all' || selectedSession === 'all'}
          variant="outline"
        >
          {downloadingBulk ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {downloadProgress.current}/{downloadProgress.total}
            </>
          ) : (
            <>
              <FileArchive className="h-4 w-4 mr-2" />
              Download All as ZIP
            </>
          )}
        </Button>
      </div>

      {downloadingBulk && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating receipts...</span>
                <span>{downloadProgress.current} of {downloadProgress.total}</span>
              </div>
              <Progress value={(downloadProgress.current / downloadProgress.total) * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{filteredPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Receipt className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount Paid</p>
                <p className="text-2xl font-bold">₦{totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Calendar className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Session</p>
                <p className="text-2xl font-bold">{uniqueSessions[0] || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or receipt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="first">First Term</SelectItem>
                <SelectItem value="second">Second Term</SelectItem>
                <SelectItem value="third">Third Term</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger>
                <SelectValue placeholder="Select Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {uniqueSessions.map(session => (
                  <SelectItem key={session} value={session}>{session}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-2 text-muted-foreground">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No.</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Term/Session</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.receipt_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payment.student?.profile?.first_name} {payment.student?.profile?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.student?.class?.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.fee_type?.name}</TableCell>
                      <TableCell className="font-semibold text-success">
                        ₦{payment.amount_paid.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.payment_method === 'online' ? 'default' : 'secondary'}>
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{payment.term}</span> / {payment.session}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
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

export default PaymentHistory;
