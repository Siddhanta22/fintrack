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
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
      `}
      style={{ backgroundColor: `${category.color}20`, color: category.color }}
    >
      {category.name}
    </span>
  );
}

