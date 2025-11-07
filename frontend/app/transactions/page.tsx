'use client';

/**
 * Transactions page: view and manage all transactions.
 * 
 * Features:
 * - List all transactions with filtering
 * - CSV upload
 * - Categorization controls
 * - Pagination
 * 
 * State management:
 * - React Query for fetching transactions
 * - Local state for filters
 * - Mutations for upload and categorization
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/lib/api';
import { TransactionTable } from '@/components/TransactionTable';
import { UploadBox } from '@/components/UploadBox';

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState<number>(1); // In real app, get from user's accounts
  const [filters, setFilters] = useState({ limit: 100, offset: 0 });

  // Fetch transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.list(filters),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => transactionsApi.upload(file, accountId, true),
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  // Categorize mutation
  const categorizeMutation = useMutation({
    mutationFn: (transactionIds?: number[]) =>
      transactionsApi.categorize(transactionIds, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const handleUpload = async (file: File) => {
    await uploadMutation.mutateAsync(file);
  };

  const handleCategorize = () => {
    categorizeMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Transactions
            </h1>
            <p className="text-gray-600 mt-1">Manage and view all your financial transactions</p>
          </div>
          <button
            onClick={handleCategorize}
            disabled={categorizeMutation.isPending}
            className="px-5 py-2.5 gradient-primary text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md flex items-center gap-2"
          >
            {categorizeMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Categorizing...
              </>
            ) : (
              <>
                <span>🏷️</span> Categorize All
              </>
            )}
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <span className="text-white text-lg">📤</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Upload CSV File</h2>
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
        </div>

        {/* Transactions Table */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <span className="text-white text-lg">💳</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">All Transactions</h2>
          </div>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="w-16 h-16 border-4 border-primary-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="text-gray-500 font-medium">Loading transactions...</p>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <TransactionTable transactions={transactions} />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-3xl">📝</span>
              </div>
              <p className="text-gray-500 font-medium">No transactions found</p>
              <p className="text-sm text-gray-400 mt-1">Upload a CSV file to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

