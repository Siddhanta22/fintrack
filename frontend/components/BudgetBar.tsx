'use client';

/**
 * BudgetBar component: visual progress bar for budget tracking.
 * 
 * Shows:
 * - Budget limit
 * - Current spending
 * - Remaining amount
 * - Visual progress bar (green if under budget, red if over)
 * 
 * This helps users quickly see if they're staying within budget.
 */

interface BudgetBarProps {
  categoryName: string;
  limit: number;
  spent: number;
  remaining: number;
}

export function BudgetBar({ categoryName, limit, spent, remaining }: BudgetBarProps) {
  const percentage = (spent / limit) * 100;
  const isOverBudget = remaining < 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-900">{categoryName}</span>
        <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-700'}`}>
          ${spent.toFixed(2)} / ${limit.toFixed(2)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${
            isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{percentage.toFixed(1)}% used</span>
        <span className={isOverBudget ? 'text-red-600 font-semibold' : ''}>
          {isOverBudget
            ? `$${Math.abs(remaining).toFixed(2)} over budget`
            : `$${remaining.toFixed(2)} remaining`}
        </span>
      </div>
    </div>
  );
}

