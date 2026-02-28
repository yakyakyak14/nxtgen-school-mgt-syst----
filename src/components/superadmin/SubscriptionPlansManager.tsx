import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Check, Crown, Zap, Building2 } from "lucide-react";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_students: number | null;
  max_staff: number | null;
  max_storage_mb: number | null;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}

export function SubscriptionPlansManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    max_students: "",
    max_staff: "",
    max_storage_mb: 1024,
    features: "",
    is_popular: false,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const planData = {
        name: data.name,
        description: data.description || null,
        price_monthly: data.price_monthly,
        price_yearly: data.price_yearly,
        max_students: data.max_students ? parseInt(data.max_students) : null,
        max_staff: data.max_staff ? parseInt(data.max_staff) : null,
        max_storage_mb: data.max_storage_mb,
        features: data.features.split("\n").filter(f => f.trim()),
        is_popular: data.is_popular,
      };

      if (data.id) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingPlan ? "Plan updated" : "Plan created");
    },
    onError: () => {
      toast.error("Failed to save plan");
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Plan deleted");
    },
    onError: () => {
      toast.error("Failed to delete plan");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Plan status updated");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_monthly: 0,
      price_yearly: 0,
      max_students: "",
      max_staff: "",
      max_storage_mb: 1024,
      features: "",
      is_popular: false,
    });
    setEditingPlan(null);
  };

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_students: plan.max_students?.toString() || "",
      max_staff: plan.max_staff?.toString() || "",
      max_storage_mb: plan.max_storage_mb || 1024,
      features: plan.features.join("\n"),
      is_popular: plan.is_popular,
    });
    setIsDialogOpen(true);
  };

  const getPlanIcon = (name: string) => {
    if (name.toLowerCase().includes("starter")) return Zap;
    if (name.toLowerCase().includes("enterprise")) return Building2;
    return Crown;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-lg" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Subscription Plans</h2>
          <p className="text-muted-foreground">Manage pricing tiers for schools</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              savePlanMutation.mutate(editingPlan ? { ...formData, id: editingPlan.id } : formData);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Plan Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Professional"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <Label>Monthly Price (₦)</Label>
                  <Input
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <Label>Yearly Price (₦)</Label>
                  <Input
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <Label>Max Students (blank = unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.max_students}
                    onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                    placeholder="e.g., 500"
                  />
                </div>
                <div>
                  <Label>Max Staff (blank = unlimited)</Label>
                  <Input
                    type="number"
                    value={formData.max_staff}
                    onChange={(e) => setFormData({ ...formData, max_staff: e.target.value })}
                    placeholder="e.g., 50"
                  />
                </div>
                <div>
                  <Label>Storage (MB)</Label>
                  <Input
                    type="number"
                    value={formData.max_storage_mb}
                    onChange={(e) => setFormData({ ...formData, max_storage_mb: parseInt(e.target.value) })}
                    min={256}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={formData.is_popular}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                  />
                  <Label>Mark as Popular</Label>
                </div>
                <div className="col-span-2">
                  <Label>Features (one per line)</Label>
                  <Textarea
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="Basic student management&#10;Attendance tracking&#10;Fee collection"
                    rows={5}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savePlanMutation.isPending}>
                  {savePlanMutation.isPending ? "Saving..." : "Save Plan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans?.map((plan) => {
          const Icon = getPlanIcon(plan.name);
          return (
            <Card key={plan.id} className={`relative ${plan.is_popular ? "border-primary shadow-lg" : ""} ${!plan.is_active ? "opacity-60" : ""}`}>
              {plan.is_popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{formatCurrency(plan.price_monthly)}</div>
                  <div className="text-sm text-muted-foreground">/month</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    or {formatCurrency(plan.price_yearly)}/year
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Students</span>
                    <span className="font-medium">{plan.max_students || "Unlimited"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Staff</span>
                    <span className="font-medium">{plan.max_staff || "Unlimited"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage</span>
                    <span className="font-medium">{(plan.max_storage_mb || 0) >= 1024 ? `${(plan.max_storage_mb || 0) / 1024} GB` : `${plan.max_storage_mb} MB`}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: plan.id, is_active: checked })}
                    />
                    <span className="text-sm">{plan.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Delete this plan?")) {
                          deletePlanMutation.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
