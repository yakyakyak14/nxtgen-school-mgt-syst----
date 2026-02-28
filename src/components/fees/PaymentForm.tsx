import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { TERMS, PAYMENT_METHODS } from '@/lib/constants';

interface Student {
  id: string;
  admission_number: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
  classes?: {
    name: string;
  };
}

interface FeeType {
  id: string;
  name: string;
  amount: number;
}

interface PaymentFormProps {
  onSuccess?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: settings } = useSchoolSettings();
  
  const [formData, setFormData] = useState({
    studentId: '',
    feeTypeId: '',
    amount: '',
    paymentMethod: 'cash',
    term: 'first' as 'first' | 'second' | 'third',
    session: settings?.current_session || '2024/2025',
  });

  useEffect(() => {
    if (open) {
      fetchStudents();
      fetchFeeTypes();
    }
  }, [open]);

  useEffect(() => {
    if (settings?.current_session) {
      setFormData(prev => ({ ...prev, session: settings.current_session }));
    }
    if (settings?.current_term) {
      setFormData(prev => ({ ...prev, term: settings.current_term }));
    }
  }, [settings]);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select(`
        id,
        admission_number,
        classes(name)
      `)
      .eq('is_active', true)
      .order('admission_number');
    if (data) setStudents(data);
  };

  const fetchFeeTypes = async () => {
    const { data } = await supabase
      .from('fee_types')
      .select('id, name, amount')
      .order('name');
    if (data) setFeeTypes(data);
  };

  const generateReceiptNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `RCP${timestamp}`;
  };

  const handleFeeTypeChange = (feeTypeId: string) => {
    const feeType = feeTypes.find(f => f.id === feeTypeId);
    setFormData({
      ...formData,
      feeTypeId,
      amount: feeType ? feeType.amount.toString() : '',
    });
  };

  const handlePaystackPayment = async () => {
    setIsLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      const platformFee = amount * 0.05;
      const schoolAmount = amount - platformFee;

      // Get student email for Paystack
      const student = students.find(s => s.id === formData.studentId);
      if (!student) throw new Error('Student not found');

      // For now, record as pending until Paystack integration is complete
      const receiptNumber = generateReceiptNumber();
      const transactionRef = `TXN_${Date.now()}`;

      const { error } = await supabase
        .from('fee_payments')
        .insert({
          student_id: formData.studentId,
          fee_type_id: formData.feeTypeId,
          amount_paid: amount,
          payment_method: 'online',
          term: formData.term,
          session: formData.session,
          receipt_number: receiptNumber,
          transaction_reference: transactionRef,
          platform_fee: platformFee,
          school_amount: schoolAmount,
        });

      if (error) throw error;

      toast.success(`Payment recorded! Receipt: ${receiptNumber}`);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashPayment = async () => {
    setIsLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      const platformFee = amount * 0.05;
      const schoolAmount = amount - platformFee;
      const receiptNumber = generateReceiptNumber();

      const { error } = await supabase
        .from('fee_payments')
        .insert({
          student_id: formData.studentId,
          fee_type_id: formData.feeTypeId,
          amount_paid: amount,
          payment_method: formData.paymentMethod,
          term: formData.term,
          session: formData.session,
          receipt_number: receiptNumber,
          platform_fee: platformFee,
          school_amount: schoolAmount,
        });

      if (error) throw error;

      toast.success(`Payment recorded! Receipt: ${receiptNumber}`);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.paymentMethod === 'online') {
      await handlePaystackPayment();
    } else {
      await handleCashPayment();
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      feeTypeId: '',
      amount: '',
      paymentMethod: 'cash',
      term: settings?.current_term || 'first',
      session: settings?.current_session || '2024/2025',
    });
  };

  const filteredStudents = students.filter(s =>
    s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Fee Payment
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Input
              placeholder="Search by admission number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            <Select
              value={formData.studentId}
              onValueChange={(value) => setFormData({ ...formData, studentId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.admission_number} - {student.classes?.name || 'No Class'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session">Session *</Label>
              <Input
                id="session"
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Term *</Label>
              <Select
                value={formData.term}
                onValueChange={(value: 'first' | 'second' | 'third') => setFormData({ ...formData, term: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((term) => (
                    <SelectItem key={term.value} value={term.value}>{term.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feeType">Fee Type *</Label>
            <Select
              value={formData.feeTypeId}
              onValueChange={handleFeeTypeChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fee type" />
              </SelectTrigger>
              <SelectContent>
                {feeTypes.map((fee) => (
                  <SelectItem key={fee.id} value={fee.id}>
                    {fee.name} - ₦{fee.amount.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦) *</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                ))}
                <SelectItem value="online">Pay Online (Paystack)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.amount && (
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>₦{parseFloat(formData.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform Fee (5%):</span>
                <span>₦{(parseFloat(formData.amount) * 0.05).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>School Receives (95%):</span>
                <span>₦{(parseFloat(formData.amount) * 0.95).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : formData.paymentMethod === 'online' ? 'Pay with Paystack' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentForm;
