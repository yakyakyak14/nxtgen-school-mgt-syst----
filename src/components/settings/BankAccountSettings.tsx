import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Building2, Check, AlertCircle, Banknote } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';

interface Bank {
  name: string;
  code: string;
  slug: string;
}

export const BankAccountSettings: React.FC = () => {
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);

  const { data: gatewaySettings, refetch: refetchSettings } = useQuery({
    queryKey: ['payment-gateway-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateway_settings')
        .select('*')
        .eq('gateway_name', 'paystack')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (gatewaySettings?.school_account_number) {
      setAccountNumber(gatewaySettings.school_account_number);
      setAccountName(gatewaySettings.school_account_name || '');
      setIsVerified(true);
    }
  }, [gatewaySettings]);

  const loadBanks = async () => {
    setLoadingBanks(true);
    try {
      const response = await supabase.functions.invoke('paystack-payment', {
        body: { action: 'list-banks' },
      });

      if (response.error) throw response.error;
      if (response.data?.banks) {
        setBanks(response.data.banks);
      }
    } catch (error: any) {
      console.error('Error loading banks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load banks. Please check your Paystack API key.',
      });
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyAccount = async () => {
    if (!selectedBank || accountNumber.length !== 10) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please select a bank and enter a valid 10-digit account number.',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await supabase.functions.invoke('paystack-payment', {
        body: {
          action: 'verify-account',
          account_number: accountNumber,
          bank_code: selectedBank,
        },
      });

      if (response.error) throw response.error;

      if (response.data?.account_name) {
        setAccountName(response.data.account_name);
        setIsVerified(true);
        toast({
          title: 'Account Verified',
          description: `Account name: ${response.data.account_name}`,
        });
      }
    } catch (error: any) {
      console.error('Error verifying account:', error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.message || 'Could not verify account. Please check the details.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const setupSubaccount = async () => {
    if (!isVerified || !accountName || !selectedBank) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please verify your account first.',
      });
      return;
    }

    setIsSettingUp(true);
    try {
      // Create subaccount
      const subaccountResponse = await supabase.functions.invoke('paystack-payment', {
        body: {
          action: 'create-subaccount',
          business_name: accountName,
          bank_code: selectedBank,
          account_number: accountNumber,
          percentage_charge: 95, // School gets 95%
        },
      });

      if (subaccountResponse.error) throw subaccountResponse.error;

      const subaccountCode = subaccountResponse.data?.subaccount_code;

      if (subaccountCode) {
        // Create transaction split
        const splitResponse = await supabase.functions.invoke('paystack-payment', {
          body: {
            action: 'create-split',
            subaccount_code: subaccountCode,
          },
        });

        if (splitResponse.error) {
          console.warn('Split creation failed:', splitResponse.error);
        }
      }

      await refetchSettings();

      toast({
        title: 'Bank Account Configured',
        description: 'Your school will now receive 95% of all payments.',
      });
    } catch (error: any) {
      console.error('Error setting up subaccount:', error);
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: error.message || 'Failed to configure bank account.',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const selectedBankName = banks.find(b => b.code === selectedBank)?.name || gatewaySettings?.school_bank_name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          School Bank Account (Paystack)
        </CardTitle>
        <CardDescription>
          Configure your school's bank account to receive 95% of all fee payments. 
          The platform retains 5% for services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {gatewaySettings?.school_subaccount_code ? (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Bank Account Configured</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              <div className="mt-2 space-y-1">
                <p><strong>Bank:</strong> {gatewaySettings.school_bank_name}</p>
                <p><strong>Account:</strong> {gatewaySettings.school_account_number}</p>
                <p><strong>Name:</strong> {gatewaySettings.school_account_name}</p>
                <p><strong>Share:</strong> {gatewaySettings.school_percentage}% of payments</p>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Only the Director can configure the school's bank account. 
                All fee payments will be split: 95% to school, 5% platform fee.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Bank</Label>
                <Select value={selectedBank} onValueChange={(value) => {
                  setSelectedBank(value);
                  setIsVerified(false);
                  setAccountName('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select bank"} />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Account Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setAccountNumber(value);
                      setIsVerified(false);
                      setAccountName('');
                    }}
                    placeholder="0123456789"
                    maxLength={10}
                  />
                  <Button 
                    variant="outline" 
                    onClick={verifyAccount}
                    disabled={isVerifying || accountNumber.length !== 10 || !selectedBank}
                  >
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                  </Button>
                </div>
              </div>
            </div>

            {isVerified && accountName && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">Account Verified</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Account Name:</strong> {accountName}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Bank:</strong> {selectedBankName}
                </p>
              </div>
            )}

            <Button 
              onClick={setupSubaccount} 
              disabled={!isVerified || isSettingUp}
              className="w-full"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Configure Bank Account
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
