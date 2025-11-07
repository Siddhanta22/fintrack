'use client';

/**
 * CategoryBadge component: displays a category with its color.
 * 
 * This is a small, reusable component that shows:
 * - Category name
 * - Background color from category.color
 * - Optional click handler for editing
 */

interface Category {
  id: number;
  name: string;
  color: string;
}

interface CategoryBadgeProps {
  category: Category;
  onClick?: () => void;
}

export function CategoryBadge({ category, onClick }: CategoryBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-md' : ''}
      `}
      style={{ 
        backgroundColor: `${category.color}15`, 
        color: category.color,
        border: `1px solid ${category.color}30`
      }}
    >
      {category.name}
    </span>
  );
}

