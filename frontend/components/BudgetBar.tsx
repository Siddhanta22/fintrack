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
    <div className="space-y-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-900">{categoryName}</span>
        <span className={`font-bold text-sm ${
          isOverBudget 
            ? 'bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent' 
            : 'text-gray-700'
        }`}>
          ${spent.toFixed(2)} / ${limit.toFixed(2)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            isOverBudget 
              ? 'bg-gradient-to-r from-red-500 to-rose-500' 
              : percentage > 80 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                : 'bg-gradient-to-r from-green-400 to-emerald-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-600 font-medium">{percentage.toFixed(1)}% used</span>
        <span className={`font-semibold ${
          isOverBudget 
            ? 'text-red-600' 
            : 'text-green-600'
        }`}>
          {isOverBudget
            ? `⚠️ $${Math.abs(remaining).toFixed(2)} over budget`
            : `✓ $${remaining.toFixed(2)} remaining`}
        </span>
      </div>
    </div>
  );
}

