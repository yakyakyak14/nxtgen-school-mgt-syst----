import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift, Heart, ExternalLink } from 'lucide-react';

interface DonationDialogProps {
  trigger?: React.ReactNode;
  projectId?: string;
  context?: 'alumni' | 'parent';
}

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

const DonationDialog: React.FC<DonationDialogProps> = ({ trigger, projectId, context = 'alumni' }) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorEmail, setDonorEmail] = useState(profile?.email || '');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const amount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(val);

  const donateMutation = useMutation({
    mutationFn: async () => {
      if (!amount || amount <= 0) throw new Error('Invalid amount');
      const donorName = isAnonymous ? 'Anonymous' : `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Donor';
      const email = donorEmail || profile?.email || '';

      // Save donation record
      const { error } = await supabase.from('alumni_donations').insert({
        donor_name: donorName,
        donor_email: email || null,
        amount,
        project_id: projectId || null,
        message: message || null,
        is_anonymous: isAnonymous,
        payment_status: 'pending',
      });
      if (error) throw error;

      // Redirect to Paystack for payment
      const paystackUrl = `https://paystack.com/pay?amount=${amount * 100}&email=${encodeURIComponent(email)}&currency=NGN`;
      window.open(paystackUrl, '_blank');
    },
    onSuccess: () => {
      toast.success('Redirecting to payment... Thank you for your generosity!');
      setOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['alumni-donations'] });
    },
    onError: () => toast.error('Failed to process donation. Please try again.'),
  });

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setMessage('');
    setIsAnonymous(false);
  };

  const handleSelectPreset = (val: number) => {
    setSelectedAmount(val);
    setCustomAmount('');
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    setSelectedAmount(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Gift className="h-4 w-4 mr-2" />
            Make a Donation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            Make a Donation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Preset amounts */}
          <div className="space-y-2">
            <Label>Select Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map(val => (
                <Button
                  key={val}
                  type="button"
                  variant={selectedAmount === val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSelectPreset(val)}
                >
                  {formatCurrency(val)}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <Label>Or Enter Custom Amount (₦)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={customAmount}
              onChange={e => handleCustomChange(e.target.value)}
              min={100}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={donorEmail}
              onChange={e => setDonorEmail(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message (Optional)</Label>
            <Textarea
              placeholder="Add a message with your donation..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
            />
          </div>

          {/* Anonymous */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="anonymous-donation"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked === true)}
            />
            <Label htmlFor="anonymous-donation" className="cursor-pointer font-serif italic text-base">
              Make this donation anonymous
            </Label>
          </div>

          {/* Summary & Submit */}
          {amount > 0 && (
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm text-muted-foreground">You are donating</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(amount)}</p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={() => donateMutation.mutate()}
            disabled={!amount || amount <= 0 || donateMutation.isPending}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {donateMutation.isPending ? 'Redirecting to Paystack...' : `Donate ${amount > 0 ? formatCurrency(amount) : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationDialog;
