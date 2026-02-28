import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STAFF_CATEGORIES, USER_ROLES } from '@/lib/constants';

interface JobTitle {
  id: string;
  title: string;
  category: 'academic' | 'non_academic';
}

interface StaffFormProps {
  onSuccess?: () => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    category: 'academic' as 'academic' | 'non_academic',
    jobTitleId: '',
    dateEmployed: '',
    salary: '',
    role: 'teacher' as string,
  });

  useEffect(() => {
    fetchJobTitles();
  }, []);

  const fetchJobTitles = async () => {
    const { data } = await supabase
      .from('job_titles')
      .select('id, title, category')
      .order('title');
    if (data) setJobTitles(data);
  };

  const generateStaffId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(100 + Math.random() * 900);
    return `STF/${year}/${random}`;
  };

  const filteredJobTitles = jobTitles.filter(jt => jt.category === formData.category);

  const getRolesForCategory = () => {
    if (formData.category === 'academic') {
      return USER_ROLES.filter(r => ['director', 'principal', 'headmaster', 'teacher'].includes(r.value));
    }
    return USER_ROLES.filter(r => ['admin_staff', 'non_teaching_staff'].includes(r.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create staff user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: generateStaffId(), // Temporary password
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update profile
        await supabase
          .from('profiles')
          .update({
            phone: formData.phone || null,
            gender: formData.gender as 'male' | 'female' || null,
            date_of_birth: formData.dateOfBirth || null,
            address: formData.address || null,
          })
          .eq('id', authData.user.id);

        // Create staff record
        const staffId = generateStaffId();
        const { error: staffError } = await supabase
          .from('staff')
          .insert({
            user_id: authData.user.id,
            staff_id: staffId,
            category: formData.category,
            job_title_id: formData.jobTitleId || null,
            date_employed: formData.dateEmployed || null,
            salary: formData.salary ? parseFloat(formData.salary) : null,
          });

        if (staffError) throw staffError;

        // Assign role
        await supabase
          .from('user_roles')
          .insert([{
            user_id: authData.user.id,
            role: formData.role as 'director' | 'principal' | 'headmaster' | 'teacher' | 'admin_staff' | 'non_teaching_staff' | 'parent' | 'student'
          }]);

        toast.success(`Staff member added successfully! Staff ID: ${staffId}`);
        setOpen(false);
        resetForm();
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Staff creation error:', error);
      toast.error(error.message || 'Failed to add staff member');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: '',
      dateOfBirth: '',
      address: '',
      category: 'academic',
      jobTitleId: '',
      dateEmployed: '',
      salary: '',
      role: 'teacher',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Staff Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: 'academic' | 'non_academic') => 
                  setFormData({ ...formData, category: value, jobTitleId: '', role: value === 'academic' ? 'teacher' : 'non_teaching_staff' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Select
                value={formData.jobTitleId}
                onValueChange={(value) => setFormData({ ...formData, jobTitleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job title" />
                </SelectTrigger>
                <SelectContent>
                  {filteredJobTitles.map((jt) => (
                    <SelectItem key={jt.id} value={jt.id}>{jt.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">System Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {getRolesForCategory().map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEmployed">Date Employed</Label>
              <Input
                id="dateEmployed"
                type="date"
                value={formData.dateEmployed}
                onChange={(e) => setFormData({ ...formData, dateEmployed: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary (₦)</Label>
              <Input
                id="salary"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="Monthly salary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Staff'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StaffForm;
