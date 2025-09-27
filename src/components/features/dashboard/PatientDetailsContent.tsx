"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { ChevronDown, Eye, EyeOff, Search, ChevronUp } from "lucide-react";

// Import the patient details schema
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

/**
 * Patient Details Content Component
 * Simple, clean interface for viewing psychological evaluation schema
 */
export function PatientDetailsContent() {
  const [showFieldTypes, setShowFieldTypes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const schema = patientDetailsSchema as PatientDetailsSchema;

  /**
   * Get display name for section
   */
  const getSectionDisplayName = (key: string): string => {
    const displayNames: Record<string, string> = {
      "personal-info": "Informazioni Personali",
      "medical-history": "Storia Medica",
      "psychological-assessment": "Valutazione Psicologica",
      "behavioral-patterns": "Pattern Comportamentali",
      "social-context": "Contesto Sociale",
      "treatment-history": "Storia del Trattamento",
    };
    return displayNames[key] || key.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  /**
   * Get display name for field
   */
  const getFieldDisplayName = (key: string): string => {
    const displayNames: Record<string, string> = {
      "first-name": "Nome",
      "last-name": "Cognome",
      "age": "Età",
      "gender": "Genere",
      "date-of-birth": "Data di Nascita",
      "contact-info": "Informazioni di Contatto",
      "emergency-contact": "Contatto di Emergenza",
      "medical-conditions": "Condizioni Mediche",
      "medications": "Farmaci",
      "allergies": "Allergie",
      "family-history": "Storia Familiare",
      "surgical-history": "Storia Chirurgica",
      "current-symptoms": "Sintomi Attuali",
      "mood-assessment": "Valutazione dell'Umore",
      "anxiety-levels": "Livelli di Ansia",
      "depression-indicators": "Indicatori di Depressione",
      "cognitive-function": "Funzione Cognitiva",
      "sleep-patterns": "Pattern del Sonno",
      "eating-habits": "Abitudini Alimentari",
      "substance-use": "Uso di Sostanze",
      "social-support": "Supporto Sociale",
      "living-situation": "Situazione Abitativa",
      "occupation": "Occupazione",
      "education": "Istruzione",
      "previous-therapy": "Terapia Precedente",
      "current-treatment": "Trattamento Attuale",
      "treatment-goals": "Obiettivi del Trattamento",
      "progress-notes": "Note di Progresso",
    };
    return displayNames[key] || key.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  /**
   * Recursively search in nested fields
   */
  const searchInFields = useCallback((fields: Record<string, FieldDefinition>, searchLower: string): boolean => {
    return Object.entries(fields).some(([fieldKey, fieldDef]) => {
      const fieldName = getFieldDisplayName(fieldKey).toLowerCase();
      
      // Check field name
      if (fieldName.includes(searchLower)) return true;
      
      // Check field description
      if (fieldDef.description && fieldDef.description.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Check enum values
      if (fieldDef.enum && fieldDef.enum.some((value) => value.toLowerCase().includes(searchLower))) {
        return true;
      }
      
      // Recursively search in nested properties
      if (fieldDef.properties) {
        return searchInFields(fieldDef.properties, searchLower);
      }
      
      return false;
    });
  }, []);

  /**
   * Filter sections based on search term (including nested fields)
   */
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) {
      return Object.entries(schema.properties);
    }

    const searchLower = searchTerm.toLowerCase();
    return Object.entries(schema.properties).filter(
      ([sectionKey, sectionDef]) => {
        const sectionName = getSectionDisplayName(sectionKey).toLowerCase();
        
        // Check section name
        if (sectionName.includes(searchLower)) return true;
        
        // Check fields in section (including nested fields)
        if (sectionDef.properties) {
          return searchInFields(sectionDef.properties, searchLower);
        }
        
        return false;
      }
    );
  }, [searchTerm, schema.properties, searchInFields]);

  /**
   * Toggle all sections expanded/collapsed
   */
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

  /**
   * Toggle individual section
   */
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

  /**
   * Render field definition (including nested fields)
   */
  const renderField = (fieldKey: string, fieldDef: FieldDefinition, level: number = 0) => {
    const fieldName = getFieldDisplayName(fieldKey);
    const hasEnum = fieldDef.enum && fieldDef.enum.length > 0;
    const hasDescription = fieldDef.description;
    const hasNestedFields = fieldDef.properties && Object.keys(fieldDef.properties).length > 0;
    const indentClass = level > 0 ? `ml-${level * 4}` : "";

    return (
      <div key={fieldKey} className={`space-y-1 py-2 ${indentClass}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{fieldName}</span>
          {showFieldTypes && (
            <span className="text-xs text-muted-foreground">
              {fieldDef.type}
            </span>
          )}
        </div>
        
        {hasDescription && (
          <p className="text-sm text-muted-foreground">{fieldDef.description}</p>
        )}
        
        {hasEnum && (
          <div className="text-sm text-muted-foreground">
            Valori: {fieldDef.enum!.join(", ")}
            {fieldDef.enum!.length > 6 && ` (+${fieldDef.enum!.length - 6} altri)`}
          </div>
        )}

        {/* Render nested fields */}
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

  /**
   * Render section with collapsible content
   */
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
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-lg text-left">{sectionName}</h3>
              <span className="text-sm text-muted-foreground">
                {fieldCount} campi
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
              Nessun campo disponibile in questa sezione
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
              Schema di Valutazione Psicologica
            </h2>
            <p className="dashboard-section__description">
              Visualizza tutti i campi disponibili per la valutazione psicologica strutturata dei pazienti
            </p>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tutte le Sezioni</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllSections}
                >
                  {allExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  {allExpanded ? "Chiudi Tutte" : "Apri Tutte"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFieldTypes(!showFieldTypes)}
                >
                  {showFieldTypes ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showFieldTypes ? "Nascondi" : "Mostra"} Tipi
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div>
              <Input
                placeholder="Cerca sezioni, campi o valori..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Sections List */}
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
                      Nessuna sezione trovata per &quot;{searchTerm}&quot;
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