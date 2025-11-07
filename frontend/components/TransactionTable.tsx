'use client';

/**
 * TransactionTable component: displays transactions in a table.
 * 
 * Features:
 * - Sortable columns
 * - Category badges with colors
 * - Amount formatting (negative = red, positive = green)
 * - Date formatting
 * - Click to edit category
 * 
 * This component receives transactions as props and renders them.
 * State management (fetching, filtering) is handled by parent components using React Query.
 */

import { format } from 'date-fns';
import { CategoryBadge } from './CategoryBadge';

export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: string;
  transaction_type: string;
  category?: { id: number; name: string; color: string };
  account?: { name: string };
}

interface TransactionTableProps {
  transactions: Transaction[];
  onCategoryClick?: (transactionId: number) => void;
}

export function TransactionTable({ transactions, onCategoryClick }: TransactionTableProps) {
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                No transactions found
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => {
              const amount = parseFloat(transaction.amount);
              const isExpense = amount < 0;

              return (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(transaction.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.category ? (
                      <CategoryBadge
                        category={transaction.category}
                        onClick={() => onCategoryClick?.(transaction.id)}
                      />
                    ) : (
                      <button
                        onClick={() => onCategoryClick?.(transaction.id)}
                        className="text-xs text-gray-400 hover:text-primary-600"
                      >
                        Uncategorized
                      </button>
                    )}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      isExpense ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatAmount(transaction.amount)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

