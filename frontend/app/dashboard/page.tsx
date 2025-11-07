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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { insightsApi, transactionsApi } from '@/lib/api';
import { ChartCard } from '@/components/ChartCard';
import { TransactionTable } from '@/components/TransactionTable';
import { UploadBox } from '@/components/UploadBox';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [accountId] = useState<number>(1); // TODO: Get from user's accounts
  const [showUpload, setShowUpload] = useState(false);

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

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => transactionsApi.upload(file, accountId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      setShowUpload(false);
    },
  });

  const handleUpload = async (file: File) => {
    await uploadMutation.mutateAsync(file);
  };

  const downloadCSVTemplate = () => {
    const csvContent = "Date,Description,Amount\n2024-01-15,Example Transaction,-50.00\n2024-01-16,Salary Deposit,3000.00";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaction_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's your financial overview.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadCSVTemplate}
              className="px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 text-sm font-medium flex items-center gap-2"
            >
              <span>📥</span> Template
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="px-4 py-2.5 gradient-primary text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-md"
            >
              <span>{showUpload ? '✕' : '📤'}</span> {showUpload ? 'Cancel' : 'Upload CSV'}
            </button>
            <button
              onClick={() => router.push('/transactions')}
              className="px-4 py-2.5 gradient-success text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center gap-2 shadow-md"
            >
              <span>➕</span> Add Transaction
            </button>
          </div>
        </div>

        {/* CSV Upload Section */}
        {showUpload && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-primary-100 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                <span className="text-white text-xl">📤</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Transactions from CSV</h2>
                <p className="text-sm text-gray-600">
                  Upload a CSV file with columns: Date, Description, Amount
                </p>
              </div>
            </div>
            <UploadBox
              onUpload={handleUpload}
              accountId={accountId}
              disabled={uploadMutation.isPending}
            />
            {uploadMutation.isSuccess && (
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 rounded-xl border border-green-200 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <span className="font-medium">Successfully uploaded {uploadMutation.data.transactions_created} transactions!</span>
                </div>
              </div>
            )}
            {uploadMutation.isError && (
              <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 text-red-800 rounded-xl border border-red-200 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xl">❌</span>
                  <span>Error: {(uploadMutation.error as any)?.response?.data?.detail || 'Upload failed'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 card-hover group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <span className="text-white text-lg">💰</span>
              </div>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ${parseFloat(insights?.total_income || '0').toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 card-hover group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <span className="text-white text-lg">💸</span>
              </div>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              ${parseFloat(insights?.total_expenses || '0').toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 card-hover group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${
                parseFloat(insights?.net_income || '0') >= 0
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                  : 'bg-gradient-to-br from-red-400 to-rose-500'
              }`}>
                <span className="text-white text-lg">{parseFloat(insights?.net_income || '0') >= 0 ? '📈' : '📉'}</span>
              </div>
            </div>
            <p
              className={`text-3xl font-bold bg-clip-text text-transparent ${
                parseFloat(insights?.net_income || '0') >= 0
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                  : 'bg-gradient-to-r from-red-600 to-rose-600'
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
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <span className="text-white text-lg">💳</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          {transactions && transactions.length > 0 ? (
            <TransactionTable transactions={transactions} />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-3xl">📝</span>
              </div>
              <p className="text-gray-500 font-medium">No transactions found</p>
              <p className="text-sm text-gray-400 mt-1">Upload a CSV or add a transaction to get started</p>
            </div>
          )}
        </div>

        {/* AI Summary */}
        {insights?.ai_summary && (
          <div className="bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-50 rounded-2xl shadow-soft p-6 border border-primary-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
                <span className="text-white text-lg">🤖</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">AI Insights</h2>
            </div>
            <p className="text-gray-700 leading-relaxed bg-white/60 rounded-xl p-4 backdrop-blur-sm">{insights.ai_summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}

