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

  const getCategoryClass = (category: string) => {
    switch (category) {
      case "psychological":
        return "patient-tag patient-tag--psychological";
      case "physical":
        return "patient-tag patient-tag--physical";
      case "behavioral":
        return "patient-tag patient-tag--behavioral";
      default:
        return "patient-tag";
    }
  };

  return (
    <div className="patient-tag-group">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag.id}
          className={getCategoryClass(tag.category)}
          title={`Categoria: ${tag.category}`}
        >
          {tag.label}
        </span>
      ))}
      {tags.length > 3 && (
        <span
          className="patient-tag patient-tag--more"
          title={`Altri ${tags.length - 3} tag`}
        >
          +{tags.length - 3}
        </span>
      )}
    </div>
  );
}
