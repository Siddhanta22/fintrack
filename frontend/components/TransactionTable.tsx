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
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                No transactions found
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => {
              const amount = parseFloat(transaction.amount);
              const isExpense = amount < 0;

              return (
                <tr 
                  key={transaction.id} 
                  className="hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-transparent transition-all duration-200 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(transaction.date), 'EEEE')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                      {transaction.description}
                    </div>
                    {transaction.account && (
                      <div className="text-xs text-gray-500 mt-1">
                        {transaction.account.name}
                      </div>
                    )}
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
                        className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-primary-100 hover:text-primary-600 transition-all"
                      >
                        Uncategorized
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-bold ${
                        isExpense 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}
                    >
                      {formatAmount(transaction.amount)}
                    </span>
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

