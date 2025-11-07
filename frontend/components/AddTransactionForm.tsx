'use client';

/**
 * AddTransactionForm component: form for manually adding transactions.
 * 
 * Features:
 * - Date picker
 * - Description input
 * - Amount input
 * - Account selection
 * - Category selection
 * - Transaction type (income/expense)
 */

import { useState } from 'react';

interface AddTransactionFormProps {
  accountId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddTransactionForm({ accountId, onSuccess, onCancel }: AddTransactionFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // TODO: Implement API call to create transaction
      // await transactionsApi.create({ accountId, date, description, amount, categoryId });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter transaction description"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Use negative for expenses (e.g., -50.00), positive for income (e.g., 3000.00)
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

