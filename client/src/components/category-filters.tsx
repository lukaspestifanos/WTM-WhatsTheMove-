import { Button } from "@/components/ui/button";

interface CategoryFiltersProps {
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function CategoryFilters({ activeCategory, onCategoryChange }: CategoryFiltersProps) {
  const categories = [
    { id: "parties", label: "🎉 Parties", color: "from-pink-500 to-rose-600" },
    { id: "concerts", label: "🎵 Concerts", color: "from-purple-500 to-violet-600" },
    { id: "restaurants", label: "🍽️ Food", color: "from-red-500 to-orange-600" },
    { id: "sports", label: "🏀 Sports", color: "from-amber-500 to-orange-600" },
    { id: "study", label: "📚 Study", color: "from-emerald-500 to-green-600" },
    { id: "social", label: "🎤 Social", color: "from-blue-500 to-indigo-600" },
  ];

  return (
    <div className="px-6 mb-4">
      <div className="flex space-x-3 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            onClick={() => onCategoryChange(activeCategory === category.id ? null : category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-lg transition-all ${
              activeCategory === category.id
                ? `bg-gradient-to-r ${category.color} text-white`
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-testid={`filter-${category.id}`}
          >
            {category.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
