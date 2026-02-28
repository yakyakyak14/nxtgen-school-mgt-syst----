import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Search, CreditCard, AlertCircle, CheckCircle, Clock, XCircle, Receipt, Building2 } from "lucide-react";

interface SchoolSubscription {
  id: string;
  school_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  created_at: string;
  schools: {
    name: string;
    email: string | null;
  };
  subscription_plans: {
    name: string;
    price_monthly: number;
    price_yearly: number;
  };
}

interface BillingInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export function SchoolSubscriptionsManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<SchoolSubscription | null>(null);

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["school-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_subscriptions")
        .select(`
          *,
          schools (name, email),
          subscription_plans (name, price_monthly, price_yearly)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SchoolSubscription[];
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["school-invoices", selectedSchool?.school_id],
    queryFn: async () => {
      if (!selectedSchool) return [];
      const { data, error } = await supabase
        .from("billing_invoices")
        .select("*")
        .eq("school_id", selectedSchool.school_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BillingInvoice[];
    },
    enabled: !!selectedSchool,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("school_subscriptions")
        .update({ 
          status,
          ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {})
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-subscriptions"] });
      toast.success("Subscription status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const matchesSearch = sub.schools.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      trial: { icon: <Clock className="h-3 w-3" />, variant: "secondary" },
      active: { icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
      past_due: { icon: <AlertCircle className="h-3 w-3" />, variant: "destructive" },
      cancelled: { icon: <XCircle className="h-3 w-3" />, variant: "outline" },
      expired: { icon: <XCircle className="h-3 w-3" />, variant: "outline" },
    };
    const { icon, variant } = config[status] || config.expired;
    return (
      <Badge variant={variant} className="gap-1">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter(s => s.status === "active").length || 0,
    trial: subscriptions?.filter(s => s.status === "trial").length || 0,
    pastDue: subscriptions?.filter(s => s.status === "past_due").length || 0,
    mrr: subscriptions
      ?.filter(s => s.status === "active")
      .reduce((acc, s) => {
        const price = s.billing_cycle === "monthly" 
          ? s.subscription_plans.price_monthly 
          : s.subscription_plans.price_yearly / 12;
        return acc + price;
      }, 0) || 0,
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded-lg" />
      <div className="h-96 bg-muted rounded-lg" />
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.trial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Past Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.pastDue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.mrr)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period Ends</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions?.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{sub.schools.name}</div>
                          <div className="text-sm text-muted-foreground">{sub.schools.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sub.subscription_plans.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(sub.billing_cycle === "monthly" 
                            ? sub.subscription_plans.price_monthly 
                            : sub.subscription_plans.price_yearly)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sub.billing_cycle.charAt(0).toUpperCase() + sub.billing_cycle.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(sub.current_period_end), "MMM d, yyyy")}
                        <div className="text-muted-foreground">
                          {formatDistanceToNow(new Date(sub.current_period_end), { addSuffix: true })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSchool(sub)}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Invoices
                        </Button>
                        <Select
                          value={sub.status}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: sub.id, status: value })}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="past_due">Past Due</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoices Dialog */}
      <Dialog open={!!selectedSchool} onOpenChange={(open) => !open && setSelectedSchool(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Invoices - {selectedSchool?.schools.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices?.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === "paid" ? "default" : invoice.status === "pending" ? "secondary" : "destructive"}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {invoice.paid_at ? format(new Date(invoice.paid_at), "MMM d, yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
