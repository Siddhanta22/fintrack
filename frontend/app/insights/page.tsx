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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded-xl w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-gray-500 font-medium">No insights available for this month</p>
          </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Monthly Insights
            </h1>
            <p className="text-gray-600 mt-1">Deep dive into your financial patterns</p>
          </div>
          <div className="flex gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
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
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
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
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 card-hover group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <span className="text-white text-lg">💰</span>
              </div>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ${parseFloat(insights.total_income).toLocaleString('en-US', {
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
              ${parseFloat(insights.total_expenses).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100 card-hover group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${
                parseFloat(insights.net_income) >= 0
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                  : 'bg-gradient-to-br from-red-400 to-rose-500'
              }`}>
                <span className="text-white text-lg">{parseFloat(insights.net_income) >= 0 ? '📈' : '📉'}</span>
              </div>
            </div>
            <p
              className={`text-3xl font-bold bg-clip-text text-transparent ${
                parseFloat(insights.net_income) >= 0
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                  : 'bg-gradient-to-r from-red-600 to-rose-600'
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
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-md">
                <span className="text-white text-lg">🔥</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Top Expenses</h2>
            </div>
            <div className="space-y-3">
              {insights.top_expenses.map((expense, index) => (
                <div key={index} className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-900">{expense.description}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{expense.date}</p>
                  </div>
                  <p className="text-lg font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                    ${expense.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {insights.ai_summary && (
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

