'use client';

/**
 * Dashboard page: main overview of finances.
 * 
 * This page displays:
 * - Key metrics (total income, expenses, net income)
 * - Spending by category (pie chart)
 * - Recent transactions
 * - Budget status
 * 
 * State management:
 * - Uses React Query to fetch data
 * - Automatically refetches when data becomes stale
 * - Shows loading and error states
 */

import { useQuery } from '@tanstack/react-query';
import { insightsApi, transactionsApi } from '@/lib/api';
import { ChartCard } from '@/components/ChartCard';
import { TransactionTable } from '@/components/TransactionTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format } from 'date-fns';

export default function DashboardPage() {
  // Get current month/year
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Fetch monthly insights
  const { 
    data: insights, 
    isLoading: insightsLoading, 
    error: insightsError 
  } = useQuery({
    queryKey: ['insights', month, year],
    queryFn: () => insightsApi.getMonthly(month, year),
    retry: false,
  });

  // Fetch recent transactions
  const { 
    data: transactions, 
    isLoading: transactionsLoading,
    error: transactionsError 
  } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionsApi.list({ limit: 10 }),
    retry: false,
  });

  // Check if user is not authenticated
  const isUnauthorized = 
    (insightsError as any)?.response?.status === 401 ||
    (transactionsError as any)?.response?.status === 401;

  if (isUnauthorized) {
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  if (insightsLoading || transactionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare pie chart data
  const pieData = insights?.category_breakdown.map((item) => ({
    name: item.category_name,
    value: item.amount,
  })) || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Income</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ${parseFloat(insights?.total_income || '0').toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ${parseFloat(insights?.total_expenses || '0').toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Net Income</p>
            <p
              className={`text-2xl font-bold mt-2 ${
                parseFloat(insights?.net_income || '0') >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              ${parseFloat(insights?.net_income || '0').toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending by Category */}
          <ChartCard
            title="Spending by Category"
            description={`${format(new Date(year, month - 1), 'MMMM yyyy')}`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Budget Status */}
          <ChartCard title="Budget Status" description="Current month">
            <div className="space-y-4">
              {insights?.budget_status && insights.budget_status.length > 0 ? (
                insights.budget_status.map((budget, index) => (
                  <div key={index} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{budget.category_name}</span>
                      <span
                        className={
                          budget.remaining < 0 ? 'text-red-600 font-semibold' : 'text-gray-700'
                        }
                      >
                        ${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          budget.remaining < 0
                            ? 'bg-red-500'
                            : (budget.spent / budget.limit) * 100 > 80
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((budget.spent / budget.limit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No budgets set for this month</p>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          {transactions && transactions.length > 0 ? (
            <TransactionTable transactions={transactions} />
          ) : (
            <p className="text-gray-500">No transactions found</p>
          )}
        </div>

        {/* AI Summary */}
        {insights?.ai_summary && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Insights</h2>
            <p className="text-gray-700 leading-relaxed">{insights.ai_summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}

