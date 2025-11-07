'use client';

/**
 * Insights page: detailed monthly financial insights.
 * 
 * Displays:
 * - Comprehensive monthly summary
 * - Category breakdown with charts
 * - Top expenses
 * - Budget status
 * - AI-generated insights
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api';
import { ChartCard } from '@/components/ChartCard';
import { BudgetBar } from '@/components/BudgetBar';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function InsightsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', month, year],
    queryFn: () => insightsApi.getMonthly(month, year),
  });

  if (isLoading) {
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

  if (!insights) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-500">No insights available for this month</p>
        </div>
      </div>
    );
  }

  const pieData = insights.category_breakdown.map((item) => ({
    name: item.category_name,
    value: item.amount,
  }));

  const barData = insights.category_breakdown.map((item) => ({
    name: item.category_name,
    amount: item.amount,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Monthly Insights</h1>
          <div className="flex gap-4">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Income</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${parseFloat(insights.total_income).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              ${parseFloat(insights.total_expenses).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Net Income</p>
            <p
              className={`text-3xl font-bold mt-2 ${
                parseFloat(insights.net_income) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ${parseFloat(insights.net_income).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Spending by Category" description="Pie chart">
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

          <ChartCard title="Category Spending" description="Bar chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Budget Status */}
        {insights.budget_status && insights.budget_status.length > 0 && (
          <ChartCard title="Budget Status">
            <div className="space-y-6">
              {insights.budget_status.map((budget, index) => (
                <BudgetBar
                  key={index}
                  categoryName={budget.category_name}
                  limit={budget.limit}
                  spent={budget.spent}
                  remaining={budget.remaining}
                />
              ))}
            </div>
          </ChartCard>
        )}

        {/* Top Expenses */}
        {insights.top_expenses && insights.top_expenses.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Expenses</h2>
            <div className="space-y-2">
              {insights.top_expenses.map((expense, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-gray-500">{expense.date}</p>
                  </div>
                  <p className="text-lg font-semibold text-red-600">
                    ${expense.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {insights.ai_summary && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Insights</h2>
            <p className="text-gray-700 leading-relaxed">{insights.ai_summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}

