interface PatientTag {
  id: string;
  label: string;
  category: string;
  color: string;
}

interface PatientTagsProps {
  tags: PatientTag[];
}

const CATEGORY_CLASS: Record<string, string> = {
  psychological: "patient-tag patient-tag--psychological",
  physical: "patient-tag patient-tag--physical",
  behavioral: "patient-tag patient-tag--behavioral",
};

export function PatientTags({ tags }: PatientTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, 3);
  const surplus = tags.length - visibleTags.length;

  return (
    <div className="patient-tag-group">
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          className={CATEGORY_CLASS[tag.category] ?? "patient-tag"}
          title={`Categoria: ${tag.category}`}
        >
          {tag.label}
        </span>
      ))}
      {surplus > 0 && (
        <span className="patient-tag patient-tag--more" title={`Altri ${surplus} tag`}>
          +{surplus}
        </span>
      )}
    </div>
  );
}
