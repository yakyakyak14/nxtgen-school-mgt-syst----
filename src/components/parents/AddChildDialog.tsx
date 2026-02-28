import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AddChildDialogProps {
  onSuccess?: () => void;
}

const AddChildDialog: React.FC<AddChildDialogProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [regNumber, setRegNumber] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !regNumber.trim()) return;

    setIsLoading(true);
    try {
      // Find the student by registration number
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, admission_number')
        .eq('admission_number', regNumber.trim())
        .maybeSingle();

      if (studentError) throw studentError;
      if (!student) {
        toast.error('No student found with that registration number. Please check and try again.');
        setIsLoading(false);
        return;
      }

      // Get guardian record
      const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!guardian) {
        // Create guardian record if missing
        const { data: newGuardian, error: gError } = await supabase
          .from('guardians')
          .insert({ user_id: user.id, relationship: 'parent' })
          .select()
          .single();
        
        if (gError) throw gError;
        
        await supabase
          .from('student_guardians')
          .insert({ student_id: student.id, guardian_id: newGuardian.id, is_primary: false });
      } else {
        // Check if already linked
        const { data: existing } = await supabase
          .from('student_guardians')
          .select('id')
          .eq('student_id', student.id)
          .eq('guardian_id', guardian.id)
          .maybeSingle();

        if (existing) {
          toast.info('This child is already linked to your account.');
          setIsLoading(false);
          return;
        }

        await supabase
          .from('student_guardians')
          .insert({ student_id: student.id, guardian_id: guardian.id, is_primary: false });
      }

      toast.success(`Child with registration number ${regNumber.trim()} has been added successfully!`);
      setRegNumber('');
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding child:', error);
      toast.error(error.message || 'Failed to add child');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Child/Ward
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Child or Ward</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Student Registration Number</Label>
            <Input
              placeholder="e.g., AIS/2026/0001"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the registration number assigned to your child by the school.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !regNumber.trim()}>
              {isLoading ? 'Adding...' : 'Add Child'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddChildDialog;
