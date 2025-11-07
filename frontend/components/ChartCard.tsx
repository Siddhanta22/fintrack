'use client';

/**
 * ChartCard component: wrapper for charts with title and optional description.
 * 
 * This provides consistent styling for all chart components.
 * Used for pie charts, bar charts, line charts, etc.
 */

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

