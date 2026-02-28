import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp } from 'lucide-react';

interface PaymentData {
  name: string;
  collected: number;
  outstanding: number;
}

interface FeeCollectionChartProps {
  className?: string;
}

const FeeCollectionChart: React.FC<FeeCollectionChartProps> = ({ className }) => {
  const [data, setData] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewType, setViewType] = useState<'monthly' | 'termly'>('monthly');

  useEffect(() => {
    fetchPaymentData();
  }, [viewType]);

  const fetchPaymentData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch all fee payments
      const { data: payments, error } = await supabase
        .from('fee_payments')
        .select('amount_paid, payment_date, session, term')
        .order('payment_date', { ascending: true });

      if (error) throw error;

      // Fetch all obligations for outstanding calculation
      const { data: obligations } = await supabase
        .from('student_fee_obligations')
        .select('total_amount, amount_paid, balance, session, term, created_at');

      if (viewType === 'monthly') {
        // Group by month
        const monthlyData = new Map<string, { collected: number; outstanding: number }>();
        
        // Get last 6 months
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
          months.push({ key, date });
          monthlyData.set(key, { collected: 0, outstanding: 0 });
        }

        // Sum collected amounts by month
        payments?.forEach(payment => {
          if (payment.payment_date) {
            const paymentDate = new Date(payment.payment_date);
            const key = paymentDate.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (monthlyData.has(key)) {
              const current = monthlyData.get(key)!;
              monthlyData.set(key, {
                ...current,
                collected: current.collected + Number(payment.amount_paid),
              });
            }
          }
        });

        // Calculate outstanding by month (based on obligations created that month)
        obligations?.forEach(ob => {
          if (ob.created_at) {
            const obDate = new Date(ob.created_at);
            const key = obDate.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (monthlyData.has(key)) {
              const current = monthlyData.get(key)!;
              monthlyData.set(key, {
                ...current,
                outstanding: current.outstanding + Number(ob.balance || 0),
              });
            }
          }
        });

        const chartData: PaymentData[] = months.map(m => ({
          name: m.key,
          collected: monthlyData.get(m.key)?.collected || 0,
          outstanding: monthlyData.get(m.key)?.outstanding || 0,
        }));

        setData(chartData);
      } else {
        // Group by term
        const termlyData = new Map<string, { collected: number; outstanding: number }>();
        const terms = ['First Term', 'Second Term', 'Third Term'];
        
        terms.forEach(term => {
          termlyData.set(term, { collected: 0, outstanding: 0 });
        });

        // Sum collected by term
        payments?.forEach(payment => {
          const termKey = `${payment.term.charAt(0).toUpperCase() + payment.term.slice(1)} Term`;
          if (termlyData.has(termKey)) {
            const current = termlyData.get(termKey)!;
            termlyData.set(termKey, {
              ...current,
              collected: current.collected + Number(payment.amount_paid),
            });
          }
        });

        // Sum outstanding by term
        obligations?.forEach(ob => {
          const termKey = `${ob.term.charAt(0).toUpperCase() + ob.term.slice(1)} Term`;
          if (termlyData.has(termKey)) {
            const current = termlyData.get(termKey)!;
            termlyData.set(termKey, {
              ...current,
              outstanding: current.outstanding + Number(ob.balance || 0),
            });
          }
        });

        const chartData: PaymentData[] = terms.map(term => ({
          name: term,
          collected: termlyData.get(term)?.collected || 0,
          outstanding: termlyData.get(term)?.outstanding || 0,
        }));

        setData(chartData);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (value: number) => {
    if (value >= 1000000) {
      return `₦${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `₦${(value / 1000).toFixed(0)}K`;
    }
    return `₦${value}`;
  };

  const totalCollected = data.reduce((sum, d) => sum + d.collected, 0);
  const totalOutstanding = data.reduce((sum, d) => sum + d.outstanding, 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Fee Collection Trends
          </CardTitle>
          <Select value={viewType} onValueChange={(v: 'monthly' | 'termly') => setViewType(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="termly">By Term</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-600 dark:text-green-400">Total Collected</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatAmount(totalCollected)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-600 dark:text-orange-400">Outstanding</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                  {formatAmount(totalOutstanding)}
                </p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {viewType === 'monthly' ? (
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tickFormatter={formatAmount} 
                      tick={{ fontSize: 12 }} 
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value: number) => formatAmount(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="collected"
                      name="Collected"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#colorCollected)"
                    />
                    <Area
                      type="monotone"
                      dataKey="outstanding"
                      name="Outstanding"
                      stroke="#f97316"
                      fillOpacity={1}
                      fill="url(#colorOutstanding)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tickFormatter={formatAmount} 
                      tick={{ fontSize: 12 }} 
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value: number) => formatAmount(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outstanding" name="Outstanding" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FeeCollectionChart;
