import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { generatePayslip } from '@/utils/payslipGenerator';
import {
  Plus,
  DollarSign,
  FileText,
  Users,
  Calculator,
  Download,
  Check,
  Loader2,
  Settings,
} from 'lucide-react';

interface DeductionType {
  id: string;
  name: string;
  description: string | null;
  is_percentage: boolean;
  default_value: number;
  is_active: boolean;
}

interface StaffMember {
  id: string;
  staff_id: string;
  salary: number | null;
  category: string;
  is_active: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  job_titles: {
    title: string;
  } | null;
}

interface PayrollPeriod {
  id: string;
  month: number;
  year: number;
  status: string;
  processed_at: string | null;
  notes: string | null;
}

interface PayrollRecord {
  id: string;
  staff_id: string;
  basic_salary: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  payment_status: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  staff: StaffMember;
  payroll_deductions: {
    id: string;
    name: string;
    amount: number;
    is_percentage: boolean;
    percentage_value: number | null;
  }[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Payroll() {
  const { data: settings } = useSchoolSettings();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [showNewPeriodDialog, setShowNewPeriodDialog] = useState(false);
  const [showDeductionDialog, setShowDeductionDialog] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [selectedDeductions, setSelectedDeductions] = useState<Record<string, boolean>>({});
  const [customDeductions, setCustomDeductions] = useState<Record<string, number>>({});
  const [newDeduction, setNewDeduction] = useState({ name: '', description: '', is_percentage: false, default_value: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPayrollRecords(selectedPeriod.id);
    }
  }, [selectedPeriod]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deductionsRes, staffRes, periodsRes] = await Promise.all([
        supabase.from('payroll_deduction_types').select('*').eq('is_active', true),
        supabase.from('staff').select(`
          id, staff_id, salary, category, is_active,
          profiles:user_id (first_name, last_name, email),
          job_titles:job_title_id (title)
        `).eq('is_active', true),
        supabase.from('payroll_periods').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
      ]);

      if (deductionsRes.data) setDeductionTypes(deductionsRes.data);
      if (staffRes.data) setStaff(staffRes.data as unknown as StaffMember[]);
      if (periodsRes.data) {
        setPayrollPeriods(periodsRes.data);
        if (periodsRes.data.length > 0) {
          setSelectedPeriod(periodsRes.data[0]);
        }
      }

      // Initialize selected deductions with defaults
      if (deductionsRes.data) {
        const defaults: Record<string, boolean> = {};
        const customValues: Record<string, number> = {};
        deductionsRes.data.forEach(d => {
          defaults[d.id] = true;
          customValues[d.id] = d.default_value;
        });
        setSelectedDeductions(defaults);
        setCustomDeductions(customValues);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollRecords = async (periodId: string) => {
    const { data, error } = await supabase
      .from('payroll_records')
      .select(`
        *,
        staff:staff_id (
          id, staff_id, salary, category,
          profiles:user_id (first_name, last_name, email),
          job_titles:job_title_id (title)
        ),
        payroll_deductions (id, name, amount, is_percentage, percentage_value)
      `)
      .eq('payroll_period_id', periodId);

    if (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load payroll records');
      return;
    }

    setPayrollRecords(data as unknown as PayrollRecord[]);
  };

  const createPayrollPeriod = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_periods')
        .insert({ month: newPeriod.month, year: newPeriod.year })
        .select()
        .single();

      if (error) throw error;

      setPayrollPeriods(prev => [data, ...prev]);
      setSelectedPeriod(data);
      setShowNewPeriodDialog(false);
      toast.success('Payroll period created');
    } catch (error: any) {
      console.error('Error creating period:', error);
      toast.error(error.message || 'Failed to create period');
    }
  };

  const processPayroll = async () => {
    if (!selectedPeriod || staff.length === 0) return;

    setProcessing(true);
    try {
      // Create payroll records for all active staff
      for (const member of staff) {
        const basicSalary = member.salary || 0;
        const grossSalary = basicSalary;
        
        // Calculate deductions
        let totalDeductions = 0;
        const deductionsToInsert: any[] = [];

        for (const dt of deductionTypes) {
          if (selectedDeductions[dt.id]) {
            const value = customDeductions[dt.id] || dt.default_value;
            let amount = 0;

            if (dt.is_percentage) {
              amount = (grossSalary * value) / 100;
            } else {
              amount = value;
            }

            totalDeductions += amount;
            deductionsToInsert.push({
              deduction_type_id: dt.id,
              name: dt.name,
              amount,
              is_percentage: dt.is_percentage,
              percentage_value: dt.is_percentage ? value : null,
            });
          }
        }

        const netSalary = grossSalary - totalDeductions;

        // Insert payroll record
        const { data: record, error: recordError } = await supabase
          .from('payroll_records')
          .insert({
            payroll_period_id: selectedPeriod.id,
            staff_id: member.id,
            basic_salary: basicSalary,
            gross_salary: grossSalary,
            total_deductions: totalDeductions,
            net_salary: netSalary,
          })
          .select()
          .single();

        if (recordError) {
          if (recordError.code === '23505') continue; // Skip duplicates
          throw recordError;
        }

        // Insert deductions
        if (deductionsToInsert.length > 0) {
          await supabase.from('payroll_deductions').insert(
            deductionsToInsert.map(d => ({ ...d, payroll_record_id: record.id }))
          );
        }
      }

      // Update period status
      await supabase
        .from('payroll_periods')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', selectedPeriod.id);

      await fetchPayrollRecords(selectedPeriod.id);
      await fetchData();
      toast.success('Payroll processed successfully');
    } catch (error: any) {
      console.error('Error processing payroll:', error);
      toast.error(error.message || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const markAsPaid = async (recordId: string, method: string) => {
    try {
      await supabase
        .from('payroll_records')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: method,
        })
        .eq('id', recordId);

      await fetchPayrollRecords(selectedPeriod!.id);
      toast.success('Payment recorded');
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to record payment');
    }
  };

  const downloadPayslip = async (record: PayrollRecord) => {
    if (!settings) return;

    const staffName = record.staff?.profiles
      ? `${record.staff.profiles.first_name || ''} ${record.staff.profiles.last_name || ''}`.trim()
      : 'Unknown';

    await generatePayslip(
      {
        staff: {
          name: staffName,
          staffId: record.staff?.staff_id || '',
          jobTitle: record.staff?.job_titles?.title || 'N/A',
          category: record.staff?.category || 'academic',
          email: record.staff?.profiles?.email || '',
        },
        month: selectedPeriod!.month,
        year: selectedPeriod!.year,
        basicSalary: record.basic_salary,
        grossSalary: record.gross_salary,
        deductions: record.payroll_deductions.map(d => ({
          name: d.name,
          amount: d.amount,
          isPercentage: d.is_percentage,
          percentageValue: d.percentage_value || undefined,
        })),
        totalDeductions: record.total_deductions,
        netSalary: record.net_salary,
        paymentStatus: record.payment_status,
        paidAt: record.paid_at || undefined,
        paymentMethod: record.payment_method || undefined,
        paymentReference: record.payment_reference || undefined,
      },
      {
        schoolName: settings.school_name,
        schoolAddress: settings.school_address || undefined,
        schoolPhone: settings.school_phone || undefined,
        schoolEmail: settings.school_email || undefined,
      }
    );

    toast.success('Payslip downloaded');
  };

  const addDeductionType = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_deduction_types')
        .insert(newDeduction)
        .select()
        .single();

      if (error) throw error;

      setDeductionTypes(prev => [...prev, data]);
      setSelectedDeductions(prev => ({ ...prev, [data.id]: true }));
      setCustomDeductions(prev => ({ ...prev, [data.id]: data.default_value }));
      setShowDeductionDialog(false);
      setNewDeduction({ name: '', description: '', is_percentage: false, default_value: 0 });
      toast.success('Deduction type added');
    } catch (error: any) {
      console.error('Error adding deduction:', error);
      toast.error(error.message || 'Failed to add deduction');
    }
  };

  const totalGross = payrollRecords.reduce((sum, r) => sum + r.gross_salary, 0);
  const totalDeductions = payrollRecords.reduce((sum, r) => sum + r.total_deductions, 0);
  const totalNet = payrollRecords.reduce((sum, r) => sum + r.net_salary, 0);
  const paidCount = payrollRecords.filter(r => r.payment_status === 'paid').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payroll Management</h1>
          <p className="text-muted-foreground">Process salaries and generate payslips</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showDeductionDialog} onOpenChange={setShowDeductionDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Deductions
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Deduction Types</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newDeduction.name}
                    onChange={e => setNewDeduction(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Transport Allowance"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newDeduction.description}
                    onChange={e => setNewDeduction(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={newDeduction.is_percentage}
                    onCheckedChange={checked => setNewDeduction(prev => ({ ...prev, is_percentage: !!checked }))}
                  />
                  <Label>Is Percentage</Label>
                </div>
                <div className="space-y-2">
                  <Label>Default Value {newDeduction.is_percentage ? '(%)' : '(₦)'}</Label>
                  <Input
                    type="number"
                    value={newDeduction.default_value}
                    onChange={e => setNewDeduction(prev => ({ ...prev, default_value: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <Button onClick={addDeductionType} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deduction Type
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewPeriodDialog} onOpenChange={setShowNewPeriodDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payroll Period</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select
                      value={newPeriod.month.toString()}
                      onValueChange={v => setNewPeriod(prev => ({ ...prev, month: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={newPeriod.year}
                      onChange={e => setNewPeriod(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <Button onClick={createPayrollPeriod} className="w-full">Create Period</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gross Salary</p>
                <p className="text-2xl font-bold">₦{totalGross.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Calculator className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="text-2xl font-bold">₦{totalDeductions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Payable</p>
                <p className="text-2xl font-bold">₦{totalNet.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Selection & Processing */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Payroll Processing</CardTitle>
            <div className="flex items-center gap-4">
              <Select
                value={selectedPeriod?.id || ''}
                onValueChange={v => setSelectedPeriod(payrollPeriods.find(p => p.id === v) || null)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {payrollPeriods.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {MONTHS[p.month - 1]} {p.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPeriod && selectedPeriod.status === 'pending' && (
                <Button onClick={processPayroll} disabled={processing}>
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Process Payroll
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedPeriod && selectedPeriod.status === 'pending' && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Apply Deductions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deductionTypes.map(dt => (
                  <div key={dt.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedDeductions[dt.id] || false}
                      onCheckedChange={checked => setSelectedDeductions(prev => ({ ...prev, [dt.id]: !!checked }))}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{dt.name}</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="h-8 w-20"
                          value={customDeductions[dt.id] || 0}
                          onChange={e => setCustomDeductions(prev => ({ ...prev, [dt.id]: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-sm text-muted-foreground">
                          {dt.is_percentage ? '%' : '₦'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payrollRecords.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map(record => {
                    const staffName = record.staff?.profiles
                      ? `${record.staff.profiles.first_name || ''} ${record.staff.profiles.last_name || ''}`.trim()
                      : 'Unknown';

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono">{record.staff?.staff_id}</TableCell>
                        <TableCell className="font-medium">{staffName}</TableCell>
                        <TableCell>{record.staff?.job_titles?.title || 'N/A'}</TableCell>
                        <TableCell className="text-right">₦{record.gross_salary.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">-₦{record.total_deductions.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">₦{record.net_salary.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={record.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {record.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {record.payment_status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsPaid(record.id, 'Bank Transfer')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadPayslip(record)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {selectedPeriod ? (
                <p>No payroll records yet. Click "Process Payroll" to generate records.</p>
              ) : (
                <p>Create a payroll period to get started.</p>
              )}
            </div>
          )}

          {payrollRecords.length > 0 && (
            <div className="mt-4 flex justify-between items-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">
                Paid: {paidCount} of {payrollRecords.length} staff
              </div>
              <div className="text-lg font-bold">
                Total Net Payable: ₦{totalNet.toLocaleString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
