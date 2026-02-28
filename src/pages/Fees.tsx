import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Search, Receipt, TrendingUp, AlertCircle, Download, Upload, Loader2 } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import PaymentForm from '@/components/fees/PaymentForm';
import OnlinePaymentButton from '@/components/fees/OnlinePaymentButton';
import ExportDialog from '@/components/ExportDialog';
import ImportDialog, { ImportResult } from '@/components/ImportDialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

interface Payment {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  students?: { admission_number: string; classes?: { name: string } };
  fee_types?: { name: string };
}

interface FeeStats {
  totalCollected: number;
  totalOutstanding: number;
  paymentCount: number;
  collectionRate: number;
}

const Fees: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<FeeStats>({
    totalCollected: 0,
    totalOutstanding: 0,
    paymentCount: 0,
    collectionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const { role } = useAuth();
  const isParent = role === 'parent';
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { 
    fetchData(); 
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      verifyPendingPayment();
    }
  }, []);

  const verifyPendingPayment = async () => {
    const pendingPayment = localStorage.getItem('pending_payment');
    if (!pendingPayment) return;

    try {
      const paymentData = JSON.parse(pendingPayment);
      setIsVerifying(true);
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { reference: paymentData.reference }
      });

      if (error) throw error;

      if (data?.success) {
        if (data.alreadyRecorded) {
          toast.info('Payment was already recorded');
        } else {
          toast.success(`Payment verified! Receipt: ${data.receipt_number}`);
        }
        localStorage.removeItem('pending_payment');
        fetchData();
      } else {
        toast.error(data?.error || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error('Failed to verify payment');
    } finally {
      setIsVerifying(false);
      setSearchParams({});
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [paymentsResult, obligationsResult] = await Promise.all([
        supabase.from('fee_payments')
          .select(`*, students(admission_number, classes(name)), fee_types(name)`)
          .order('payment_date', { ascending: false })
          .limit(50),
        supabase.from('student_fee_obligations')
          .select('total_amount, amount_paid, balance'),
      ]);

      if (paymentsResult.data) {
        setPayments(paymentsResult.data);
      }

      // Calculate stats
      const totalCollected = paymentsResult.data?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
      const totalOutstanding = obligationsResult.data?.reduce((sum, o) => sum + (o.balance || 0), 0) || 0;
      const paymentCount = paymentsResult.data?.length || 0;
      
      const totalExpected = totalCollected + totalOutstanding;
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      setStats({
        totalCollected,
        totalOutstanding,
        paymentCount,
        collectionRate,
      });
    } catch (error) {
      console.error('Error fetching fee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (data: Record<string, any>[]): Promise<ImportResult> => {
    const errors: { row: number; column?: string; message: string; severity: 'error' | 'warning' }[] = [];
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      if (!row.admission_number) {
        errors.push({ row: i + 1, column: 'admission_number', message: 'Missing admission number', severity: 'error' });
        continue;
      }

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('admission_number', row.admission_number)
        .maybeSingle();

      if (!student) {
        errors.push({ row: i + 1, column: 'admission_number', message: `Student not found: ${row.admission_number}`, severity: 'error' });
        continue;
      }

      const { data: feeType } = await supabase
        .from('fee_types')
        .select('id, amount')
        .eq('name', row.fee_type)
        .maybeSingle();

      if (!feeType) {
        errors.push({ row: i + 1, column: 'fee_type', message: `Fee type not found: ${row.fee_type}`, severity: 'error' });
        continue;
      }

      const amount = parseFloat(row.amount) || feeType.amount;
      const receiptNumber = `RCP${Date.now().toString(36).toUpperCase()}${i}`;

      const { error: insertError } = await supabase
        .from('fee_payments')
        .insert({
          student_id: student.id,
          fee_type_id: feeType.id,
          amount_paid: amount,
          payment_method: row.payment_method || 'cash',
          term: row.term || 'first',
          session: row.session || '2024/2025',
          receipt_number: receiptNumber,
          platform_fee: amount * 0.05,
          school_amount: amount * 0.95,
        });

      if (insertError) {
        errors.push({ row: i + 1, message: insertError.message, severity: 'error' });
      } else {
        successCount++;
      }
    }

    fetchData();

    return {
      success: errors.filter(e => e.severity === 'error').length === 0,
      successCount,
      errorCount: errors.filter(e => e.severity === 'error').length,
      errors,
    };
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K`;
    }
    return `₦${amount.toLocaleString()}`;
  };

  const exportColumns = [
    { header: 'Receipt No.', key: 'receipt_number', width: 15 },
    { header: 'Student', key: 'student', width: 20 },
    { header: 'Class', key: 'class', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Method', key: 'method', width: 12 },
  ];

  const exportData = payments.map(p => ({
    receipt_number: p.receipt_number,
    student: p.students?.admission_number || 'N/A',
    class: p.students?.classes?.name || 'N/A',
    amount: `₦${p.amount_paid.toLocaleString()}`,
    date: p.payment_date,
    method: p.payment_method,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees & Payments</h1>
          <p className="page-subtitle">Track school fees and payment records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isParent && (
            <>
              <ExportDialog
                filename="fee_payments"
                options={{
                  title: 'Fee Payments Report',
                  columns: exportColumns,
                  data: exportData,
                }}
                trigger={
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                }
              />
              <ImportDialog
                onImport={handleImport}
                expectedColumns={['admission_number', 'fee_type', 'amount', 'payment_method']}
                title="Import Payments"
                description="Upload payment records from Excel or CSV"
              />
            </>
          )}
          <OnlinePaymentButton onSuccess={fetchData} />
          {!isParent && <PaymentForm onSuccess={fetchData} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalCollected)}</p>
                    <p className="text-sm text-muted-foreground">Total Collected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.paymentCount}</p>
                    <p className="text-sm text-muted-foreground">Payments Made</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.collectionRate}%</p>
                    <p className="text-sm text-muted-foreground">Collection Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Recent Payments</CardTitle>
            <div className="search-input w-full sm:w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search payments..."
                className="border-0 bg-transparent h-8 focus-visible:ring-0"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : payments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.receipt_number}</TableCell>
                      <TableCell>{payment.students?.admission_number}</TableCell>
                      <TableCell>{payment.students?.classes?.name || 'N/A'}</TableCell>
                      <TableCell>₦{payment.amount_paid.toLocaleString()}</TableCell>
                      <TableCell>{payment.payment_date}</TableCell>
                      <TableCell><Badge variant="default">Paid</Badge></TableCell>
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

export default Fees;
