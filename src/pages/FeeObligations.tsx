import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { TERMS } from '@/lib/constants';
import { 
  Plus, 
  Search, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  FileText,
  RefreshCw
} from 'lucide-react';

interface Student {
  id: string;
  admission_number: string;
  first_name?: string | null;
  last_name?: string | null;
  class_name?: string | null;
}

interface FeeType {
  id: string;
  name: string;
  amount: number;
}

interface Obligation {
  id: string;
  student_id: string;
  fee_type_id: string;
  total_amount: number;
  amount_paid: number;
  balance: number | null;
  status: string;
  session: string;
  term: 'first' | 'second' | 'third';
  allow_installments: boolean;
  installments_count: number;
  student_admission?: string;
  student_name?: string;
  student_class?: string;
  fee_name?: string;
}

interface Class {
  id: string;
  name: string;
  level: string;
}

const FeeObligations: React.FC = () => {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { data: settings } = useSchoolSettings();

  // Form state for single assignment
  const [formData, setFormData] = useState({
    studentId: '',
    feeTypeId: '',
    session: settings?.current_session || '2024/2025',
    term: (settings?.current_term || 'first') as 'first' | 'second' | 'third',
    allowInstallments: true,
  });

  // Form state for bulk assignment
  const [bulkFormData, setBulkFormData] = useState({
    classId: '',
    feeTypeId: '',
    session: settings?.current_session || '2024/2025',
    term: (settings?.current_term || 'first') as 'first' | 'second' | 'third',
    allowInstallments: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        session: settings.current_session || prev.session,
        term: settings.current_term || prev.term,
      }));
      setBulkFormData(prev => ({
        ...prev,
        session: settings.current_session || prev.session,
        term: settings.current_term || prev.term,
      }));
    }
  }, [settings]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchObligations(),
      fetchStudents(),
      fetchFeeTypes(),
      fetchClasses(),
    ]);
    setIsLoading(false);
  };

  const fetchObligations = async () => {
    const { data, error } = await supabase
      .from('student_fee_obligations')
      .select(`
        *,
        students!inner(
          admission_number,
          user_id,
          classes(name)
        ),
        fee_types(name, amount)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching obligations:', error);
      return;
    }

    // Fetch profile names separately
    const studentUserIds = [...new Set((data || []).map(d => d.students?.user_id).filter(Boolean))];
    let profilesMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
    
    if (studentUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentUserIds);
      
      profiles?.forEach(p => {
        profilesMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
      });
    }

    const formattedData: Obligation[] = (data || []).map(ob => ({
      ...ob,
      student_admission: ob.students?.admission_number,
      student_name: ob.students?.user_id 
        ? `${profilesMap[ob.students.user_id]?.first_name || ''} ${profilesMap[ob.students.user_id]?.last_name || ''}`.trim()
        : '',
      student_class: ob.students?.classes?.name,
      fee_name: ob.fee_types?.name,
    }));

    setObligations(formattedData);
  };

  const fetchStudents = async () => {
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, admission_number, user_id, classes(name)')
      .eq('is_active', true)
      .order('admission_number');

    if (!studentsData) return;

    // Fetch profiles separately
    const userIds = studentsData.map(s => s.user_id).filter(Boolean);
    let profilesMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      profiles?.forEach(p => {
        profilesMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
      });
    }

    const formattedStudents: Student[] = studentsData.map(s => ({
      id: s.id,
      admission_number: s.admission_number,
      first_name: s.user_id ? profilesMap[s.user_id]?.first_name : null,
      last_name: s.user_id ? profilesMap[s.user_id]?.last_name : null,
      class_name: s.classes?.name,
    }));

    setStudents(formattedStudents);
  };

  const fetchFeeTypes = async () => {
    const { data } = await supabase
      .from('fee_types')
      .select('id, name, amount')
      .order('name');
    if (data) setFeeTypes(data);
  };

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('level');
    if (data) setClasses(data);
  };

  const handleAssignFee = async () => {
    if (!formData.studentId || !formData.feeTypeId) {
      toast.error('Please select student and fee type');
      return;
    }

    setIsSaving(true);
    const feeType = feeTypes.find(f => f.id === formData.feeTypeId);
    if (!feeType) {
      toast.error('Invalid fee type');
      setIsSaving(false);
      return;
    }

    // Check for existing obligation
    const { data: existing } = await supabase
      .from('student_fee_obligations')
      .select('id')
      .eq('student_id', formData.studentId)
      .eq('fee_type_id', formData.feeTypeId)
      .eq('session', formData.session)
      .eq('term', formData.term)
      .maybeSingle();

    if (existing) {
      toast.error('Fee already assigned to this student for the selected term');
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from('student_fee_obligations')
      .insert({
        student_id: formData.studentId,
        fee_type_id: formData.feeTypeId,
        total_amount: feeType.amount,
        session: formData.session,
        term: formData.term,
        allow_installments: formData.allowInstallments,
        installments_count: 2,
      });

    setIsSaving(false);

    if (error) {
      console.error('Error assigning fee:', error);
      toast.error('Failed to assign fee');
    } else {
      toast.success('Fee assigned successfully');
      setAddDialogOpen(false);
      setFormData({
        studentId: '',
        feeTypeId: '',
        session: settings?.current_session || '2024/2025',
        term: (settings?.current_term || 'first') as 'first' | 'second' | 'third',
        allowInstallments: true,
      });
      fetchObligations();
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkFormData.classId || !bulkFormData.feeTypeId) {
      toast.error('Please select class and fee type');
      return;
    }

    setIsSaving(true);
    
    // Get students in the class
    const { data: classStudents } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', bulkFormData.classId)
      .eq('is_active', true);

    if (!classStudents || classStudents.length === 0) {
      toast.error('No students found in this class');
      setIsSaving(false);
      return;
    }

    const feeType = feeTypes.find(f => f.id === bulkFormData.feeTypeId);
    if (!feeType) {
      toast.error('Invalid fee type');
      setIsSaving(false);
      return;
    }

    // Get existing obligations to avoid duplicates
    const { data: existing } = await supabase
      .from('student_fee_obligations')
      .select('student_id')
      .eq('fee_type_id', bulkFormData.feeTypeId)
      .eq('session', bulkFormData.session)
      .eq('term', bulkFormData.term)
      .in('student_id', classStudents.map(s => s.id));

    const existingIds = new Set(existing?.map(e => e.student_id) || []);
    const newStudents = classStudents.filter(s => !existingIds.has(s.id));

    if (newStudents.length === 0) {
      toast.info('All students already have this fee assigned');
      setIsSaving(false);
      return;
    }

    const insertData = newStudents.map(student => ({
      student_id: student.id,
      fee_type_id: bulkFormData.feeTypeId,
      total_amount: feeType.amount,
      session: bulkFormData.session,
      term: bulkFormData.term,
      allow_installments: bulkFormData.allowInstallments,
      installments_count: 2,
    }));

    const { error } = await supabase
      .from('student_fee_obligations')
      .insert(insertData);

    setIsSaving(false);

    if (error) {
      console.error('Error bulk assigning fees:', error);
      toast.error('Failed to assign fees');
    } else {
      toast.success(`Fee assigned to ${newStudents.length} students`);
      setBulkDialogOpen(false);
      fetchObligations();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Partial</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Pending</Badge>;
    }
  };

  const filteredObligations = obligations.filter(ob => {
    const matchesSearch = 
      ob.student_admission?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ob.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ob.fee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ob.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalObligations = obligations.reduce((sum, ob) => sum + ob.total_amount, 0);
  const totalPaid = obligations.reduce((sum, ob) => sum + ob.amount_paid, 0);
  const totalOutstanding = obligations.reduce((sum, ob) => sum + (ob.balance || 0), 0);
  const paidCount = obligations.filter(ob => ob.status === 'paid').length;

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-2xl font-bold">₦{totalObligations.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                  <p className="text-2xl font-bold">₦{totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold">₦{totalOutstanding.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fully Paid</p>
                  <p className="text-2xl font-bold">{paidCount} / {obligations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-4 w-full sm:w-auto">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or fee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Assign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Assign Fee to Class</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Class *</Label>
                    <Select
                      value={bulkFormData.classId}
                      onValueChange={(value) => setBulkFormData(prev => ({ ...prev, classId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fee Type *</Label>
                    <Select
                      value={bulkFormData.feeTypeId}
                      onValueChange={(value) => setBulkFormData(prev => ({ ...prev, feeTypeId: value }))}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Session</Label>
                      <Input
                        value={bulkFormData.session}
                        onChange={(e) => setBulkFormData(prev => ({ ...prev, session: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Term</Label>
                      <Select
                        value={bulkFormData.term}
                        onValueChange={(value: 'first' | 'second' | 'third') => setBulkFormData(prev => ({ ...prev, term: value }))}
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

                  <div className="flex items-center justify-between">
                    <Label htmlFor="bulk-installments">Allow Installments (50%/50%)</Label>
                    <Switch
                      id="bulk-installments"
                      checked={bulkFormData.allowInstallments}
                      onCheckedChange={(checked) => setBulkFormData(prev => ({ ...prev, allowInstallments: checked }))}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkAssign} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Assign to Class
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Fee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Fee to Student</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Student *</Label>
                    <Select
                      value={formData.studentId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, studentId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.admission_number} - {student.first_name} {student.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fee Type *</Label>
                    <Select
                      value={formData.feeTypeId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, feeTypeId: value }))}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Session</Label>
                      <Input
                        value={formData.session}
                        onChange={(e) => setFormData(prev => ({ ...prev, session: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Term</Label>
                      <Select
                        value={formData.term}
                        onValueChange={(value: 'first' | 'second' | 'third') => setFormData(prev => ({ ...prev, term: value }))}
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

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-installments">Allow Installments (50%/50%)</Label>
                    <Switch
                      id="allow-installments"
                      checked={formData.allowInstallments}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowInstallments: checked }))}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAssignFee} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Assign Fee
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Obligations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Obligations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Session/Term</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Installment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredObligations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No fee obligations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredObligations.map((ob) => (
                        <TableRow key={ob.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{ob.student_admission}</p>
                              <p className="text-sm text-muted-foreground">
                                {ob.student_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{ob.student_class || '-'}</TableCell>
                          <TableCell>{ob.fee_name}</TableCell>
                          <TableCell>
                            <div>
                              <p>{ob.session}</p>
                              <p className="text-sm text-muted-foreground capitalize">{ob.term} Term</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₦{ob.total_amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            ₦{ob.amount_paid.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            ₦{(ob.balance || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {ob.allow_installments ? (
                              <Badge variant="outline">50%/50%</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(ob.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeeObligations;
