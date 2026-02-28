import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, User, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BLOOD_GROUPS } from '@/lib/constants';
import { AddressAutocomplete } from '@/components/settings/AddressAutocomplete';

interface Class {
  id: string;
  name: string;
  level: string;
}

interface StudentEnrollmentFormProps {
  onSuccess?: () => void;
}

const StudentEnrollmentForm: React.FC<StudentEnrollmentFormProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  
  // Student fields
  const [studentData, setStudentData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    classId: '',
    bloodGroup: '',
    medicalConditions: '',
    previousSchool: '',
    address: '',
  });

  // Guardian fields
  const [guardianData, setGuardianData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    relationship: 'parent',
    occupation: '',
    workplace: '',
    address: '',
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('name');
    if (data) setClasses(data);
  };

  const generateAdmissionNumber = async (schoolId?: string) => {
    if (schoolId) {
      try {
        const { data, error } = await supabase.rpc('generate_school_reg_number', { _school_id: schoolId });
        if (!error && data) return data;
      } catch (e) {
        console.error('Error generating reg number:', e);
      }
    }
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `STD/${year}/${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get school_id from the schools table
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      const schoolId = schoolData?.id || null;

      if (!schoolId) {
        toast.error('No active school found. Please set up a school first.');
        setIsLoading(false);
        return;
      }

      // Generate school-specific admission number
      const admissionNumber = await generateAdmissionNumber(schoolId);

      // Build guardian name from first + last
      const guardianFullName = [guardianData.firstName, guardianData.lastName].filter(Boolean).join(' ') || null;

      // Insert student record directly — no auth account created
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .insert({
          admission_number: admissionNumber,
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          gender: studentData.gender || null,
          date_of_birth: studentData.dateOfBirth || null,
          address: studentData.address || null,
          class_id: studentData.classId || null,
          blood_group: studentData.bloodGroup || null,
          medical_conditions: studentData.medicalConditions || null,
          previous_school: studentData.previousSchool || null,
          school_id: schoolId,
          guardian_name: guardianFullName,
          guardian_email: guardianData.email || null,
          guardian_phone: guardianData.phone || null,
          guardian_relationship: guardianData.relationship || 'parent',
          guardian_occupation: guardianData.occupation || null,
          guardian_workplace: guardianData.workplace || null,
          guardian_address: guardianData.address || null,
        })
        .select()
        .single();

      if (studentError) throw studentError;

      toast.success(`Student enrolled successfully! Admission No: ${admissionNumber}`);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      console.error('Enrollment error:', error);
      toast.error(error.message || 'Failed to enroll student');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStudentData({
      firstName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      classId: '',
      bloodGroup: '',
      medicalConditions: '',
      previousSchool: '',
      address: '',
    });
    setGuardianData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      relationship: 'parent',
      occupation: '',
      workplace: '',
      address: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enroll New Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <User className="h-5 w-5" />
              <span>Student Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={studentData.firstName}
                  onChange={(e) => setStudentData({ ...studentData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={studentData.lastName}
                  onChange={(e) => setStudentData({ ...studentData, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={studentData.gender}
                  onValueChange={(value) => setStudentData({ ...studentData, gender: value })}
                  required
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
                  value={studentData.dateOfBirth}
                  onChange={(e) => setStudentData({ ...studentData, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Class *</Label>
                <Select
                  value={studentData.classId}
                  onValueChange={(value) => setStudentData({ ...studentData, classId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select
                  value={studentData.bloodGroup}
                  onValueChange={(value) => setStudentData({ ...studentData, bloodGroup: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <AddressAutocomplete
                  value={studentData.address}
                  onChange={(value) => setStudentData({ ...studentData, address: value })}
                  placeholder="Start typing student address..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previousSchool">Previous School</Label>
                <Input
                  id="previousSchool"
                  value={studentData.previousSchool}
                  onChange={(e) => setStudentData({ ...studentData, previousSchool: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Input
                  id="medicalConditions"
                  value={studentData.medicalConditions}
                  onChange={(e) => setStudentData({ ...studentData, medicalConditions: e.target.value })}
                  placeholder="Any known medical conditions"
                />
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Users className="h-5 w-5" />
              <span>Guardian/Parent Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardianFirstName">First Name</Label>
                <Input
                  id="guardianFirstName"
                  value={guardianData.firstName}
                  onChange={(e) => setGuardianData({ ...guardianData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianLastName">Last Name</Label>
                <Input
                  id="guardianLastName"
                  value={guardianData.lastName}
                  onChange={(e) => setGuardianData({ ...guardianData, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianEmail">Email</Label>
                <Input
                  id="guardianEmail"
                  type="email"
                  value={guardianData.email}
                  onChange={(e) => setGuardianData({ ...guardianData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianPhone">Phone</Label>
                <Input
                  id="guardianPhone"
                  value={guardianData.phone}
                  onChange={(e) => setGuardianData({ ...guardianData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Select
                  value={guardianData.relationship}
                  onValueChange={(value) => setGuardianData({ ...guardianData, relationship: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="uncle">Uncle</SelectItem>
                    <SelectItem value="aunt">Aunt</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={guardianData.occupation}
                  onChange={(e) => setGuardianData({ ...guardianData, occupation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workplace">Workplace</Label>
                <Input
                  id="workplace"
                  value={guardianData.workplace}
                  onChange={(e) => setGuardianData({ ...guardianData, workplace: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianAddress">Address</Label>
                <AddressAutocomplete
                  value={guardianData.address}
                  onChange={(value) => setGuardianData({ ...guardianData, address: value })}
                  placeholder="Start typing guardian address..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentEnrollmentForm;
