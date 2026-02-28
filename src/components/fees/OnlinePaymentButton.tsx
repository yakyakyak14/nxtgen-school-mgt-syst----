import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { TERMS } from '@/lib/constants';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Student {
  id: string;
  admission_number: string;
  user_id: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
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

interface Obligation {
  id: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  allow_installments: boolean;
  installments_count: number;
}

interface OnlinePaymentButtonProps {
  onSuccess?: () => void;
}

const OnlinePaymentButton: React.FC<OnlinePaymentButtonProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [students, setStudents] = useState<Student[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [obligation, setObligation] = useState<Obligation | null>(null);
  const [paymentOption, setPaymentOption] = useState<'full' | 'first_installment' | 'second_installment'>('full');
  const { data: settings } = useSchoolSettings();

  const [formData, setFormData] = useState({
    studentId: '',
    feeTypeId: '',
    amount: '',
    email: '',
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

  // Fetch existing obligation when student and fee type are selected
  useEffect(() => {
    if (formData.studentId && formData.feeTypeId && formData.session && formData.term) {
      fetchObligation();
    } else {
      setObligation(null);
    }
  }, [formData.studentId, formData.feeTypeId, formData.session, formData.term]);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select(`
        id,
        admission_number,
        user_id,
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

  const fetchObligation = async () => {
    const { data } = await supabase
      .from('student_fee_obligations')
      .select('id, total_amount, amount_paid, balance, status, allow_installments, installments_count')
      .eq('student_id', formData.studentId)
      .eq('fee_type_id', formData.feeTypeId)
      .eq('session', formData.session)
      .eq('term', formData.term)
      .maybeSingle();
    
    setObligation(data);
    
    // Auto-select payment option based on obligation status
    if (data) {
      if (data.status === 'partial') {
        setPaymentOption('second_installment');
        setFormData(prev => ({ ...prev, amount: (data.balance || 0).toString() }));
      } else if (data.allow_installments) {
        setPaymentOption('first_installment');
        setFormData(prev => ({ ...prev, amount: (data.total_amount / 2).toString() }));
      } else {
        setPaymentOption('full');
        setFormData(prev => ({ ...prev, amount: data.total_amount.toString() }));
      }
    }
  };

  const handleFeeTypeChange = (feeTypeId: string) => {
    const feeType = feeTypes.find(f => f.id === feeTypeId);
    setFormData({
      ...formData,
      feeTypeId,
      amount: feeType ? feeType.amount.toString() : '',
    });
    setPaymentOption('full');
  };

  const handleStudentChange = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setFormData(prev => ({ ...prev, studentId }));

    // Fetch student's email from profiles
    if (student?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', student.user_id)
        .single();
      
      if (profile?.email) {
        setFormData(prev => ({ ...prev, email: profile.email }));
      }
    }
  };

  const handlePaymentOptionChange = (option: 'full' | 'first_installment' | 'second_installment') => {
    setPaymentOption(option);
    const feeType = feeTypes.find(f => f.id === formData.feeTypeId);
    
    if (obligation) {
      if (option === 'full') {
        setFormData(prev => ({ ...prev, amount: obligation.total_amount.toString() }));
      } else if (option === 'first_installment') {
        setFormData(prev => ({ ...prev, amount: (obligation.total_amount / 2).toString() }));
      } else if (option === 'second_installment') {
        setFormData(prev => ({ ...prev, amount: (obligation.balance || 0).toString() }));
      }
    } else if (feeType) {
      if (option === 'full') {
        setFormData(prev => ({ ...prev, amount: feeType.amount.toString() }));
      } else if (option === 'first_installment') {
        setFormData(prev => ({ ...prev, amount: (feeType.amount / 2).toString() }));
      }
    }
  };

  const handlePaystackPayment = async () => {
    if (!formData.studentId || !formData.feeTypeId || !formData.amount || !formData.email) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    setPaymentStatus('processing');

    try {
      const amount = parseFloat(formData.amount);
      const student = students.find(s => s.id === formData.studentId);
      const feeType = feeTypes.find(f => f.id === formData.feeTypeId);
      const installmentNumber = paymentOption === 'first_installment' ? 1 : paymentOption === 'second_installment' ? 2 : null;

      // Call edge function to initialize Paystack payment
      const { data, error } = await supabase.functions.invoke('paystack-payment', {
        body: {
          action: 'initialize',
          email: formData.email,
          amount: amount * 100, // Convert to kobo
          metadata: {
            student_id: formData.studentId,
            student_name: student?.admission_number,
            fee_type_id: formData.feeTypeId,
            fee_type: feeType?.name,
            session: formData.session,
            term: formData.term,
            installment_number: installmentNumber,
            obligation_id: obligation?.id,
          },
          callback_url: `${window.location.origin}/fees?payment=success`,
        },
      });

      if (error) throw error;

      if (data?.authorization_url) {
        window.open(data.authorization_url, '_blank');
        
        localStorage.setItem('pending_payment', JSON.stringify({
          reference: data.reference,
          studentId: formData.studentId,
          feeTypeId: formData.feeTypeId,
          amount: amount,
          session: formData.session,
          term: formData.term,
          installmentNumber,
          obligationId: obligation?.id,
        }));

        setPaymentStatus('success');
        toast.success('Redirecting to Paystack...');
        
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 2000);
      } else {
        throw new Error('Failed to get payment URL');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      toast.error(error.message || 'Payment initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      feeTypeId: '',
      amount: '',
      email: '',
      term: settings?.current_term || 'first',
      session: settings?.current_session || '2024/2025',
    });
    setPaymentStatus('idle');
    setSearchTerm('');
    setObligation(null);
    setPaymentOption('full');
  };

  const filteredStudents = students.filter(s =>
    s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const amount = parseFloat(formData.amount) || 0;
  const platformFee = amount * 0.05;
  const schoolAmount = amount * 0.95;

  const canPayInstallment = obligation?.allow_installments || (!obligation && formData.feeTypeId);
  const isSecondInstallment = obligation?.status === 'partial';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <CreditCard className="h-4 w-4 mr-2" />
          Pay Online
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Pay School Fees Online
          </DialogTitle>
        </DialogHeader>

        {paymentStatus === 'success' ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Payment Initiated!</h3>
            <p className="text-muted-foreground mt-2">
              You'll be redirected to Paystack to complete your payment.
            </p>
          </div>
        ) : paymentStatus === 'error' ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Payment Failed</h3>
            <p className="text-muted-foreground mt-2">
              Please try again or contact support.
            </p>
            <Button className="mt-4" onClick={() => setPaymentStatus('idle')}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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
                onValueChange={handleStudentChange}
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

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="parent@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Payment receipt will be sent to this email
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session</Label>
                <Input
                  value={formData.session}
                  onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select
                  value={formData.term}
                  onValueChange={(value: 'first' | 'second' | 'third') => setFormData({ ...formData, term: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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

            {/* Payment Option - Installments */}
            {formData.feeTypeId && (
              <div className="space-y-3">
                <Label>Payment Option</Label>
                <RadioGroup
                  value={paymentOption}
                  onValueChange={(value: 'full' | 'first_installment' | 'second_installment') => handlePaymentOptionChange(value)}
                  className="space-y-2"
                >
                  {!isSecondInstallment && (
                    <>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="full" id="full" />
                        <Label htmlFor="full" className="flex-1 cursor-pointer">
                          <span className="font-medium">Full Payment</span>
                          <span className="text-muted-foreground text-sm ml-2">
                            (₦{(obligation?.total_amount || feeTypes.find(f => f.id === formData.feeTypeId)?.amount || 0).toLocaleString()})
                          </span>
                        </Label>
                      </div>
                      {canPayInstallment && (
                        <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="first_installment" id="first_installment" />
                          <Label htmlFor="first_installment" className="flex-1 cursor-pointer">
                            <span className="font-medium">First Installment (50%)</span>
                            <span className="text-muted-foreground text-sm ml-2">
                              (₦{((obligation?.total_amount || feeTypes.find(f => f.id === formData.feeTypeId)?.amount || 0) / 2).toLocaleString()})
                            </span>
                          </Label>
                        </div>
                      )}
                    </>
                  )}
                  {isSecondInstallment && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-green-500 bg-green-50 dark:bg-green-900/20">
                      <RadioGroupItem value="second_installment" id="second_installment" />
                      <Label htmlFor="second_installment" className="flex-1 cursor-pointer">
                        <span className="font-medium">Second Installment (Balance)</span>
                        <span className="text-green-600 dark:text-green-400 text-sm ml-2">
                          (₦{(obligation?.balance || 0).toLocaleString()})
                        </span>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
                
                {obligation && (
                  <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                    <AlertDescription>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Total Fee:</span>
                          <span className="font-medium">₦{obligation.total_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Already Paid:</span>
                          <span className="font-medium text-green-600">₦{obligation.amount_paid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span>Outstanding:</span>
                          <span className="font-bold text-orange-600">₦{(obligation.balance || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                readOnly={paymentOption !== 'full'}
              />
            </div>

            {amount > 0 && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-semibold">₦{amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform Fee (5%):</span>
                      <span>₦{platformFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>School Receives (95%):</span>
                      <span>₦{schoolAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePaystackPayment} 
                disabled={isLoading || !formData.studentId || !formData.feeTypeId || !formData.amount || !formData.email}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay ₦{amount.toLocaleString()}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnlinePaymentButton;
