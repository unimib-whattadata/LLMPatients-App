"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { ChevronDown, Eye, EyeOff, Search, ChevronUp } from "lucide-react";


import patientDetailsSchema from "~/server/db/patient-details.json";

interface FieldDefinition {
  type: string;
  enum?: string[];
  description?: string;
  items?: {
    type: string;
    enum?: string[];
  };
  properties?: Record<string, FieldDefinition>;
  additionalProperties?: boolean;
}

interface SectionDefinition {
  type: string;
  additionalProperties?: boolean;
  properties?: Record<string, FieldDefinition>;
}

interface PatientDetailsSchema {
  $schema: string;
  title: string;
  type: string;
  additionalProperties: boolean;
  properties: Record<string, SectionDefinition>;
}

export function PatientDetailsContent() {
  const [showFieldTypes, setShowFieldTypes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const schema = patientDetailsSchema as PatientDetailsSchema;

  
  const getSectionDisplayName = (key: string): string => {
    const displayNames: Record<string, string> = {
      "personal-info": "Personal Information",
      "medical-history": "Medical History",
      "psychological-assessment": "Psychological Assessment",
      "behavioral-patterns": "Behavioral Patterns",
      "social-context": "Social Context",
      "treatment-history": "Treatment History",
    };
    return displayNames[key] || key.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

    const getFieldDisplayName = (key: string): string => {
    const displayNames: Record<string, string> = {
      "first-name": "First Name",
      "last-name": "Last Name",
      "age": "Age",
      "gender": "Gender",
      "date-of-birth": "Date of Birth",
      "contact-info": "Contact Information",
      "emergency-contact": "Emergency Contact",
      "medical-conditions": "Medical Conditions",
      "medications": "Medications",
      "allergies": "Allergies",
      "family-history": "Family History",
      "surgical-history": "Surgical History",
      "current-symptoms": "Current Symptoms",
      "mood-assessment": "Mood Assessment",
      "anxiety-levels": "Anxiety Levels",
      "depression-indicators": "Depression Indicators",
      "cognitive-function": "Cognitive Function",
      "sleep-patterns": "Sleep Patterns",
      "eating-habits": "Eating Habits",
      "substance-use": "Substance Use",
      "social-support": "Social Support",
      "living-situation": "Living Situation",
      "occupation": "Occupation",
      "education": "Education",
      "previous-therapy": "Previous Therapy",
      "current-treatment": "Current Treatment",
      "treatment-goals": "Treatment Goals",
      "progress-notes": "Progress Notes",
    };
    return displayNames[key] || key.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

    const searchInFields = useCallback((fields: Record<string, FieldDefinition>, searchLower: string): boolean => {
    return Object.entries(fields).some(([fieldKey, fieldDef]) => {
      const fieldName = getFieldDisplayName(fieldKey).toLowerCase();
      
      
      if (fieldName.includes(searchLower)) return true;
      
      
      if (fieldDef.description && fieldDef.description.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      
      if (fieldDef.enum && fieldDef.enum.some((value) => value.toLowerCase().includes(searchLower))) {
        return true;
      }
      
      
      if (fieldDef.properties) {
        return searchInFields(fieldDef.properties, searchLower);
      }
      
      return false;
    });
  }, []);

    const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) {
      return Object.entries(schema.properties);
    }

    const searchLower = searchTerm.toLowerCase();
    return Object.entries(schema.properties).filter(
      ([sectionKey, sectionDef]) => {
        const sectionName = getSectionDisplayName(sectionKey).toLowerCase();
        
        
        if (sectionName.includes(searchLower)) return true;
        
        
        if (sectionDef.properties) {
          return searchInFields(sectionDef.properties, searchLower);
        }
        
        return false;
      }
    );
  }, [searchTerm, schema.properties, searchInFields]);

    const toggleAllSections = () => {
    if (allExpanded) {
      setExpandedSections(new Set());
      setAllExpanded(false);
    } else {
      const allSectionKeys = new Set(Object.keys(schema.properties));
      setExpandedSections(allSectionKeys);
      setAllExpanded(true);
    }
  };

    const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
    setAllExpanded(newExpanded.size === Object.keys(schema.properties).length);
  };

    const renderField = (fieldKey: string, fieldDef: FieldDefinition, level: number = 0) => {
    const fieldName = getFieldDisplayName(fieldKey);
    const hasEnum = fieldDef.enum && fieldDef.enum.length > 0;
    const hasDescription = fieldDef.description;
    const hasNestedFields = fieldDef.properties && Object.keys(fieldDef.properties).length > 0;
    const indentClass = level > 0 ? `ml-${level * 4}` : "";

    return (
      <div key={fieldKey} className={`space-y-1 py-2 ${indentClass}`}>
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="break-words text-sm font-medium">{fieldName}</span>
          {showFieldTypes && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {fieldDef.type}
            </span>
          )}
        </div>
        
        {hasDescription && (
          <p className="text-sm text-muted-foreground">{fieldDef.description}</p>
        )}
        
        {hasEnum && (
          <div className="text-sm text-muted-foreground">
            Values: {fieldDef.enum!.join(", ")}
            {fieldDef.enum!.length > 6 && ` (+${fieldDef.enum!.length - 6} more)`}
          </div>
        )}

        {}
        {hasNestedFields && (
          <div className="mt-2 space-y-1">
            {Object.entries(fieldDef.properties!).map(([nestedKey, nestedDef]) =>
              renderField(nestedKey, nestedDef, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

    const renderSection = (sectionKey: string, sectionDef: SectionDefinition) => {
    const sectionName = getSectionDisplayName(sectionKey);
    const hasFields = sectionDef.properties && Object.keys(sectionDef.properties).length > 0;
    const fieldCount = hasFields ? Object.keys(sectionDef.properties!).length : 0;
    const isExpanded = expandedSections.has(sectionKey);

    return (
      <Collapsible 
        key={sectionKey} 
        className="border-b pb-4"
        open={isExpanded}
        onOpenChange={() => toggleSection(sectionKey)}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-2 h-auto"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-left sm:flex-row sm:items-center sm:gap-4">
              <h3 className="break-words text-left text-lg font-semibold">{sectionName}</h3>
              <span className="shrink-0 text-sm text-muted-foreground">
                {fieldCount} fields
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-2 py-4">
          {hasFields ? (
            <div className="space-y-3">
              {Object.entries(sectionDef.properties!).map(([fieldKey, fieldDef]) =>
                renderField(fieldKey, fieldDef)
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No fields available in this section
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="dashboard-panel-stack">
      <section
        className="dashboard-section"
        aria-labelledby="patient-attributes-schema"
      >
        <div className="dashboard-section__header">
          <div>
            <h2 id="patient-attributes-schema" className="dashboard-section__title">
              Psychological Assessment Schema
            </h2>
            <p className="dashboard-section__description">
              View all available fields for structured patient psychological assessment
            </p>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="space-y-6">
            {}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold">All Sections</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllSections}
                >
                  {allExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  {allExpanded ? "Collapse All" : "Expand All"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFieldTypes(!showFieldTypes)}
                >
                  {showFieldTypes ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showFieldTypes ? "Hide" : "Show"} Types
                </Button>
              </div>
            </div>

            {}
            <div>
              <Input
                placeholder="Search sections, fields, or values..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {}
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredSections.length > 0 ? (
                  filteredSections.map(([sectionKey, sectionDef]: [string, SectionDefinition]) =>
                    renderSection(sectionKey, sectionDef)
                  )
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No sections found for &quot;{searchTerm}&quot;
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </section>
    </div>
  );
}
