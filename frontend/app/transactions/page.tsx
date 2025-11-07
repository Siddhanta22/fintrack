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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <button
            onClick={handleCategorize}
            disabled={categorizeMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {categorizeMutation.isPending ? 'Categorizing...' : 'Categorize All'}
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV</h2>
          <UploadBox
            onUpload={handleUpload}
            accountId={accountId}
            disabled={uploadMutation.isPending}
          />
          {uploadMutation.isSuccess && (
            <div className="mt-4 p-4 bg-green-50 text-green-800 rounded">
              Successfully uploaded {uploadMutation.data.transactions_created} transactions!
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Transactions</h2>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <TransactionTable transactions={transactions} />
          ) : (
            <p className="text-gray-500 text-center py-8">No transactions found</p>
          )}
        </div>
      </div>
    </div>
  );
}

