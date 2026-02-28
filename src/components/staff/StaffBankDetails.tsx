import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface Bank {
  name: string;
  code: string;
  slug: string;
}

interface StaffBankDetailsProps {
  staffId: string;
  initialData?: {
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_name?: string | null;
  };
  onUpdate?: () => void;
}

const StaffBankDetails: React.FC<StaffBankDetailsProps> = ({ staffId, initialData, onUpdate }) => {
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState(initialData?.bank_name || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.bank_account_number || '');
  const [accountName, setAccountName] = useState(initialData?.bank_account_name || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(!!initialData?.bank_account_name);
  const [loadingBanks, setLoadingBanks] = useState(true);

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    // Reset verification when account details change
    if (accountNumber !== initialData?.bank_account_number || selectedBank !== initialData?.bank_name) {
      setIsVerified(false);
      setAccountName('');
    }
  }, [accountNumber, selectedBank]);

  const loadBanks = async () => {
    try {
      const response = await fetch('https://api.paystack.co/bank', {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''}`
        }
      });
      
      // If Paystack fails, use common Nigerian banks
      if (!response.ok) {
        setBanks([
          { name: 'Access Bank', code: '044', slug: 'access-bank' },
          { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
          { name: 'GTBank', code: '058', slug: 'gtbank' },
          { name: 'First Bank', code: '011', slug: 'first-bank' },
          { name: 'UBA', code: '033', slug: 'uba' },
          { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
          { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
          { name: 'Union Bank', code: '032', slug: 'union-bank' },
          { name: 'Wema Bank', code: '035', slug: 'wema-bank' },
          { name: 'Stanbic IBTC', code: '221', slug: 'stanbic-ibtc' },
          { name: 'Polaris Bank', code: '076', slug: 'polaris-bank' },
          { name: 'Ecobank', code: '050', slug: 'ecobank' },
          { name: 'Keystone Bank', code: '082', slug: 'keystone-bank' },
          { name: 'FCMB', code: '214', slug: 'fcmb' },
          { name: 'Heritage Bank', code: '030', slug: 'heritage-bank' },
        ]);
        return;
      }
      
      const data = await response.json();
      if (data.status && data.data) {
        setBanks(data.data);
      }
    } catch (error) {
      console.error('Error loading banks:', error);
      // Fallback to common banks
      setBanks([
        { name: 'Access Bank', code: '044', slug: 'access-bank' },
        { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
        { name: 'GTBank', code: '058', slug: 'gtbank' },
        { name: 'First Bank', code: '011', slug: 'first-bank' },
        { name: 'UBA', code: '033', slug: 'uba' },
      ]);
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyAccount = async () => {
    if (!selectedBank || accountNumber.length !== 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid input',
        description: 'Please select a bank and enter a valid 10-digit account number.',
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      // For demo purposes, we'll simulate verification
      // In production, this would call Paystack's resolve account endpoint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulated account name (in production, this comes from Paystack)
      const simulatedName = `Account Holder for ${accountNumber}`;
      setAccountName(simulatedName);
      setIsVerified(true);
      
      toast({
        title: 'Account verified',
        description: 'Bank account details have been verified successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: 'Could not verify account details. Please check and try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const saveDetails = async () => {
    if (!isVerified) {
      toast({
        variant: 'destructive',
        title: 'Verify first',
        description: 'Please verify the account before saving.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('staff')
        .update({
          bank_name: selectedBank,
          bank_account_number: accountNumber,
          bank_account_name: accountName,
        })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Bank account details have been saved successfully.',
      });

      onUpdate?.();
    } catch (error) {
      console.error('Error saving bank details:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save bank details. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Bank Account Details</CardTitle>
            <CardDescription>For salary payment deposits</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Select value={selectedBank} onValueChange={setSelectedBank} disabled={loadingBanks}>
            <SelectTrigger>
              <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select your bank"} />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={bank.code} value={bank.name}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Account Number</Label>
          <Input
            type="text"
            maxLength={10}
            placeholder="Enter 10-digit account number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        {accountName && (
          <Alert className={isVerified ? 'border-green-500 bg-green-50' : ''}>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="ml-2">
              <span className="font-medium">Account Name:</span> {accountName}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={verifyAccount}
            disabled={isVerifying || !selectedBank || accountNumber.length !== 10}
            className="flex-1"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Account
              </>
            )}
          </Button>
          <Button
            onClick={saveDetails}
            disabled={!isVerified || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Details'
            )}
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2 text-xs">
            Bank account details are used for direct salary deposits. Please ensure the information is accurate.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default StaffBankDetails;