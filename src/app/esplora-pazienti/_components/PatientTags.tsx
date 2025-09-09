interface PatientTag {
  id: string;
  label: string;
  category: string;
  color: string;
}

interface PatientTagsProps {
  tags: PatientTag[];
}

/**
 * PatientTags Component
 * Displays patient tags as styled badges
 */
export function PatientTags({ tags }: PatientTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "psychological":
        return "bg-purple-900/50 text-purple-300 border-purple-700";
      case "physical":
        return "bg-blue-900/50 text-blue-300 border-blue-700";
      case "behavioral":
        return "bg-orange-900/50 text-orange-300 border-orange-700";
      default:
        return "bg-gray-700 text-gray-300 border-gray-600";
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag.id}
          className={`px-3 py-1 text-xs font-medium rounded-full border ${getCategoryColor(
            tag.category
          )}`}
          title={`Categoria: ${tag.category}`}
        >
          {tag.label}
        </span>
      ))}
      {tags.length > 3 && (
        <span
          className="px-3 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-400 border border-gray-600"
          title={`Altri ${tags.length - 3} tag`}
        >
          +{tags.length - 3}
        </span>
      )}
    </div>
  );
}