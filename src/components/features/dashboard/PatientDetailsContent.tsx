"use client";

import React, { useState, useMemo } from "react";

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
 * Displays the structured psychological evaluation schema in an organized, user-friendly format
 */
export function PatientDetailsContent() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);
  const [showFieldTypes, setShowFieldTypes] = useState(true);

  const schema = patientDetailsSchema as PatientDetailsSchema;

  /**
   * Collect all field keys recursively for expansion controls
   */
  const collectFieldKeys = (
    fields?: Record<string, FieldDefinition>,
  ): string[] => {
    if (!fields) return [];
    const keys: string[] = [];

    const traverse = (entries: Record<string, FieldDefinition>) => {
      Object.entries(entries).forEach(([key, def]) => {
        keys.push(key);
        if (def.properties) {
          traverse(def.properties);
        }
      });
    };

    traverse(fields);
    return keys;
  };

  /**
   * Filter sections based on search term
   */
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) {
      return Object.entries(schema.properties);
    }

    const searchLower = searchTerm.toLowerCase();
    return Object.entries(schema.properties).filter(
      ([sectionKey, sectionDef]) => {
        const sectionName = getSectionDisplayName(sectionKey).toLowerCase();
        if (sectionName.includes(searchLower)) return true;

        // Check fields within the section
        if (sectionDef.properties) {
          return Object.entries(sectionDef.properties).some(
            ([fieldKey, fieldDef]) => {
              const fieldName = getFieldDisplayName(fieldKey).toLowerCase();
              if (fieldName.includes(searchLower)) return true;

              // Check enum values
              if (fieldDef.enum) {
                return fieldDef.enum.some((value) =>
                  getEnumDisplayName(value).toLowerCase().includes(searchLower),
                );
              }

              return false;
            },
          );
        }

        return false;
      },
    );
  }, [searchTerm, schema.properties]);

  /**
   * Toggle section expansion
   */
  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  /**
   * Toggle subsection expansion
   */
  const toggleSubsection = (subsectionKey: string) => {
    setExpandedSubsections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subsectionKey)) {
        newSet.delete(subsectionKey);
      } else {
        newSet.add(subsectionKey);
      }
      return newSet;
    });
  };

  /**
   * Toggle all sections expansion
   */
  const toggleAllSections = () => {
    if (allExpanded) {
      setExpandedSections(new Set());
      setExpandedSubsections(new Set());
      setAllExpanded(false);
      return;
    }

    const allSectionKeys = new Set(filteredSections.map(([key]) => key));
    const allFieldKeys = new Set<string>();

    filteredSections.forEach(([, sectionDef]) => {
      collectFieldKeys(sectionDef.properties).forEach((fieldKey) => {
        allFieldKeys.add(fieldKey);
      });
    });

    setExpandedSections(allSectionKeys);
    setExpandedSubsections(allFieldKeys);
    setAllExpanded(true);
  };

  /**
   * Get display name for section
   */
  const getSectionDisplayName = (key: string): string => {
    const names: Record<string, string> = {
      dati_socio_culturali: "Dati Socio-Culturali",
      sviluppo_famiglia_storia: "Sviluppo e Storia Familiare",
      istruzione_lavoro_condizioni: "Istruzione, Lavoro e Condizioni",
      rete_sociale_relazioni: "Rete Sociale e Relazioni",
      presentazione_clinica: "Presentazione Clinica",
      funzionamento_psicologico: "Funzionamento Psicologico",
      rischi_condotte: "Rischi e Condotte",
      salute_fisica_stile_vita: "Salute Fisica e Stile di Vita",
      percorso_cura_adesione: "Percorso di Cura e Adesione",
      risorse_benessere_prospettive: "Risorse, Benessere e Prospettive",
      esame_stato_mentale: "Esame dello Stato Mentale",
    };
    return (
      names[key] ??
      key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  /**
   * Get display name for field
   */
  const getFieldDisplayName = (key: string): string => {
    const names: Record<string, string> = {
      stato_civile: "Stato Civile",
      lingua_parlata: "Lingua Parlata",
      background_culturale: "Background Culturale",
      credenze_religiose: "Credenze Religiose",
      stato_migratorio: "Stato Migratorio",
      valori_morali: "Valori Morali",
      esperienze_infantili: "Esperienze Infantili",
      eventi_crescita_significativi: "Eventi di Crescita Significativi",
      dinamiche_familiari_evolutiva: "Dinamiche Familiari Evolutive",
      malattie_psichiatriche_familiari: "Malattie Psichiatriche Familiari",
      relazioni_attuali_genitori: "Relazioni Attuali con i Genitori",
      interazioni_familiari: "Interazioni Familiari",
      livello_istruzione: "Livello di Istruzione",
      storia_lavorativa: "Storia Lavorativa",
      stabilita_abitativa: "Stabilità Abitativa",
      situazione_finanziaria: "Situazione Finanziaria",
      hobby_interessi: "Hobby e Interessi",
      amicizie: "Amicizie",
      relazioni_coetanei_colleghi: "Relazioni con Coetanei/Colleghi",
      relazioni_romantiche: "Relazioni Romantiche",
      relazioni_sessuali: "Relazioni Sessuali",
      uso_social_media: "Uso dei Social Media",
      sintomi_principali: "Sintomi Principali",
      comorbidita_psichiatriche: "Comorbidità Psichiatriche",
      diagnosi_psichiatriche_pregresse: "Diagnosi Psichiatriche Pregresse",
      funzionamento_affettivo_umore: "Funzionamento Affettivo e Umore",
      senso_di_se_e_altri: "Senso di Sé e degli Altri",
      pensiero_stile_cognitivo: "Pensiero e Stile Cognitivo",
      attenzione_concentrazione: "Attenzione e Concentrazione",
      memoria: "Memoria",
      funzioni_cognitive_superiori: "Funzioni Cognitive Superiori",
      strategie_coping: "Strategie di Coping",
      meccanismi_difesa: "Meccanismi di Difesa",
      dinamiche_ricorrenti: "Dinamiche Ricorrenti",
      emozioni_espresse_congruenza: "Emozioni Espresse e Congruenza",
      autolesionismo_suicidalita: "Autolesionismo e Suicidabilità",
      uso_sostanze: "Uso di Sostanze",
      aggressivita_eterodiretta: "Aggressività Eterodiretta",
      comportamenti_impulsivi_rischio: "Comportamenti Impulsivi a Rischio",
      inganno_manipolazione: "Inganno e Manipolazione",
      attivita_illecite: "Attività Illecite",
      senso_di_colpa: "Senso di Colpa",
      salute_fisica_generale: "Salute Fisica Generale",
      condizioni_mediche_preesistenti: "Condizioni Mediche Preexistenti",
      attivita_fisica: "Attività Fisica",
      fumo: "Fumo",
      alcol: "Alcol",
      sostanze: "Sostanze",
      sonno: "Sonno",
      alimentazione: "Alimentazione",
      esperienze_terapeutiche_pregresse: "Esperienze Terapeutiche Pregresse",
      resistenze_trattamento: "Resistenze al Trattamento",
      obiettivi_terapeutici: "Obiettivi Terapeutici",
      storia_farmacologica: "Storia Farmacologica",
      trattamenti_farmacologici_correnti: "Trattamenti Farmacologici Correnti",
      risposta_ai_farmaci: "Risposta ai Farmaci",
      ricoveri_psichiatrici_pregressi: "Ricoveri Psichiatrici Pregressi",
      accessi_pronto_soccorso: "Accessi al Pronto Soccorso",
      precedenti_drop_out: "Precedenti Drop-out",
      insight_mentalizzazione: "Insight e Mentalizzazione",
      motivazione_cambiamento: "Motivazione al Cambiamento",
      stadio_cambiamento: "Stadio di Cambiamento",
      resilienza_psicologica: "Resilienza Psicologica",
      soddisfazione_vita: "Soddisfazione della Vita",
      speranza_futuro: "Speranza nel Futuro",
      obiettivi_lungo_termine: "Obiettivi a Lungo Termine",
      aspetto_espressione: "Aspetto ed Espressione",
      atteggiamento_verso_clinico: "Atteggiamento verso il Clinico",
      coscienza_orientamento: "Coscienza e Orientamento",
      linguaggio_eloquio: "Linguaggio ed Eloquio",
      umore_affettivita_emotivita: "Umore, Affettività ed Emotività",
      pensiero_forma_contenuto: "Pensiero: Forma e Contenuto",
      percezioni: "Percezioni",
      funzioni_cognitive: "Funzioni Cognitive",
      comportamento_psicomotorio: "Comportamento Psicomotorio",
      disponibilita_colloquio: "Disponibilità al Colloquio",
      insight_giudizio: "Insight e Giudizio",
    };
    return (
      names[key] ??
      key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  /**
   * Get display name for enum value
   */
  const getEnumDisplayName = (value: string): string => {
    const names: Record<string, string> = {
      single: "Single",
      convivente: "Convivente",
      "sposato/a": "Sposato/a",
      "separato/a": "Separato/a",
      "divorziato/a": "Divorziato/a",
      "vedovo/a": "Vedovo/a",
      "unione civile": "Unione Civile",
      altro: "Altro",
      monolingue: "Monolingue",
      bilingue: "Bilingue",
      multilingue: "Multilingue",
      urbano: "Urbano",
      rurale: "Rurale",
      "minoranza etnica": "Minoranza Etnica",
      maggioranza: "Maggioranza",
      cattolico: "Cattolico",
      "cristiano (altre)": "Cristiano (altre)",
      musulmano: "Musulmano",
      ebraico: "Ebraico",
      buddista: "Buddista",
      indù: "Indù",
      agnostico: "Agnostico",
      ateo: "Ateo",
      "spirituale-non religioso": "Spirituale-non religioso",
      nativo: "Nativo",
      "1ª generazione": "1ª Generazione",
      "2ª generazione": "2ª Generazione",
      rifugiato: "Rifugiato",
      "richiedente asilo": "Richiedente Asilo",
      "cittadinanza acquisita": "Cittadinanza Acquisita",
      tradizionali: "Tradizionali",
      liberali: "Liberali",
      religiosi: "Religiosi",
      laici: "Laici",
      deontologici: "Deontologici",
      relativisti: "Relativisti",
      normative: "Normative",
      avversità: "Avversità",
      bullismo: "Bullismo",
      neglect: "Neglect",
      abuso: "Abuso",
      malattia: "Malattia",
      migrazione: "Migrazione",
      lutti: "Lutti",
      traumi: "Traumi",
      abusi: "Abusi",
      separazioni: "Separazioni",
      trasferimenti: "Trasferimenti",
      coese: "Coese",
      conflittuali: "Conflittuali",
      iperprotettive: "Iperprotettive",
      negligenti: "Negligenti",
      abusive: "Abusive",
      "separazioni/affido": "Separazioni/Affido",
      istituzionalizzazione: "Istituzionalizzazione",
      ansia: "Ansia",
      depressione: "Depressione",
      "disturbo bipolare": "Disturbo Bipolare",
      schizofrenia: "Schizofrenia",
      "uso di sostanze": "Uso di Sostanze",
      "disturbi di personalità": "Disturbi di Personalità",
      "disturbi neuroevolutivi": "Disturbi Neuroevolutivi",
      "storia di suicidio": "Storia di Suicidio",
      buone: "Buone",
      distanti: "Distanti",
      interrotte: "Interrotte",
      ambivalenti: "Ambivalenti",
      dipendenti: "Dipendenti",
      supportive: "Supportive",
      critiche: "Critiche",
      ostili: "Ostili",
      triangolazioni: "Triangolazioni",
      parentificazione: "Parentificazione",
      nessuna: "Nessuna",
      primaria: "Primaria",
      secondaria: "Secondaria",
      diploma: "Diploma",
      "laurea triennale": "Laurea Triennale",
      "laurea magistrale": "Laurea Magistrale",
      dottorato: "Dottorato",
      studente: "Studente",
      disoccupato: "Disoccupato",
      tirocinante: "Tirocinante",
      precario: "Precario",
      "part-time": "Part-time",
      "full-time": "Full-time",
      "autonomo/freelance": "Autonomo/Freelance",
      caregiver: "Caregiver",
      pensionato: "Pensionato",
      "proprietà stabile": "Proprietà Stabile",
      "affitto stabile": "Affitto Stabile",
      coabitazione: "Coabitazione",
      "alloggio temporaneo": "Alloggio Temporaneo",
      "comunità/istituto": "Comunità/Istituto",
      senzatetto: "Senzatetto",
      precaria: "Precaria",
      sufficiente: "Sufficiente",
      stabile: "Stabile",
      "con debiti": "Con Debiti",
      "con sussidi": "Con Sussidi",
      "supporto familiare": "Supporto Familiare",
      sport: "Sport",
      arte: "Arte",
      musica: "Musica",
      lettura: "Lettura",
      videogiochi: "Videogiochi",
      natura: "Natura",
      volontariato: "Volontariato",
      numerose: "Numerose",
      "poche ma stabili": "Poche ma Stabili",
      superficiali: "Superficiali",
      assenti: "Assenti",
      adeguate: "Adeguate",
      isolate: "Isolate",
      "bullismo subito": "Bullismo Subito",
      "bullismo agito": "Bullismo Agito",
      stabili: "Stabili",
      occasionali: "Occasionali",
      multiple: "Multiple",
      violente: "Violente",
      "non attive": "Non Attive",
      "attive protette": "Attive Protette",
      "attive non protette": "Attive Non Protette",
      "consensuali (storia)": "Consensuali (Storia)",
      "non consensuali (storia)": "Non Consensuali (Storia)",
      intensita: "Intensità",
      impatto: "Impatto",
      bassa: "Bassa",
      moderata: "Moderata",
      elevata: "Elevata",
      positivo: "Positivo",
      neutro: "Neutro",
      negativo: "Negativo",
      bipolare: "Bipolare",
      psicotica: "Psicotica",
      "trauma/stress": "Trauma/Stress",
      alimentare: "Alimentare",
      neuroevolutiva: "Neuroevolutiva",
      OCD: "OCD",
      dissociativa: "Dissociativa",
      presenti: "Presenti",
      labile: "Labile",
      reattivo: "Reattivo",
      iporegolato: "Iporegolato",
      iperregolato: "Iperregolato",
      disforico: "Disforico",
      euforico: "Euforico",
      depresso: "Depresso",
      integrato: "Integrato",
      fragile: "Fragile",
      diffuso: "Diffuso",
      grandioso: "Grandioso",
      svalutato: "Svalutato",
      fiducioso: "Fiducioso",
      diffidente: "Diffidente",
      coerente: "Coerente",
      ruminativo: "Ruminativo",
      perseverativo: "Perseverativo",
      disorganizzato: "Disorganizzato",
      rigido: "Rigido",
      flessibile: "Flessibile",
      paranoide: "Paranoide",
      "nella norma": "Nella Norma",
      ridotta: "Ridotta",
      distraibile: "Distraibile",
      ipervigilanza: "Ipervigilanza",
      "lieve deficit": "Lieve Deficit",
      "moderato deficit": "Moderato Deficit",
      "grave deficit": "Grave Deficit",
      "lieve compromissione": "Lieve Compromissione",
      "moderata compromissione": "Moderata Compromissione",
      "grave compromissione": "Grave Compromissione",
      "orientato al problema": "Orientato al Problema",
      "orientato all'emozione": "Orientato all'Emozione",
      evitamento: "Evitamento",
      "ricerca di supporto": "Ricerca di Supporto",
      ruminazione: "Ruminazione",
      dissociazione: "Dissociazione",
      maturi: "Maturi",
      nevrotici: "Nevrotici",
      primitivi: "Primitivi",
      manipolatività: "Manipolatività",
      sottomissione: "Sottomissione",
      svalutazione: "Svalutazione",
      dipendenza: "Dipendenza",
      controllo: "Controllo",
      "idealizzazione/svalutazione": "Idealizzazione/Svalutazione",
      congrue: "Congrue",
      incongrue: "Incongrue",
      "iper-espresse": "Iper-espresse",
      "ipo-espresse": "Ipo-espresse",
      alessitimia: "Alessitimia",
      NSSI: "NSSI",
      ideazione: "Ideazione",
      pianificazione: "Pianificazione",
      tentativi: "Tentativi",
      "rischio imminente": "Rischio Imminente",
      alcol: "Alcol",
      cannabis: "Cannabis",
      stimolanti: "Stimolanti",
      oppioidi: "Oppioidi",
      sedativi: "Sedativi",
      poliuso: "Poliuso",
      verbale: "Verbale",
      fisica: "Fisica",
      episodica: "Episodica",
      strumentale: "Strumentale",
      "gioco d'azzardo": "Gioco d'Azzardo",
      "guida pericolosa": "Guida Pericolosa",
      promiscuità: "Promiscuità",
      "spese compulsive": "Spese Compulsive",
      "binge cibo": "Binge Cibo",
      "binge alcol": "Binge Alcol",
      autolesionismo: "Autolesionismo",
      frequenti: "Frequenti",
      "precedenti penali": "Precedenti Penali",
      "procedimenti in corso": "Procedimenti in Corso",
      "misure alternative": "Misure Alternative",
      appropriato: "Appropriato",
      eccessivo: "Eccessivo",
      patologico: "Patologico",
      buona: "Buona",
      discreta: "Discreta",
      scadente: "Scadente",
      cardiovascolari: "Cardiovascolari",
      "endocrino-metaboliche": "Endocrino-metaboliche",
      neurologiche: "Neurologiche",
      respiratorie: "Respiratorie",
      gastrointestinali: "Gastrointestinali",
      "dolore cronico": "Dolore Cronico",
      gravidanza: "Gravidanza",
      ex: "Ex",
      sì: "Sì",
      moderato: "Moderato",
      regolare: "Regolare",
      "difficoltà addormentamento": "Difficoltà Addormentamento",
      "risvegli multipli": "Risvegli Multipli",
      "risveglio precoce": "Risveglio Precoce",
      ipersonnia: "Ipersonnia",
      "ritmo irregolare": "Ritmo Irregolare",
      restrittiva: "Restrittiva",
      abbuffate: "Abbuffate",
      "alimentazione emotiva": "Alimentazione Emotiva",
      iperfagia: "Iperfagia",
      iporessia: "Iporessia",
      "psicoterapia individuale": "Psicoterapia Individuale",
      familiare: "Familiare",
      "di gruppo": "Di Gruppo",
      TCC: "TCC",
      psicodinamica: "Psicodinamica",
      counselling: "Counselling",
      psicoeducazione: "Psicoeducazione",
      breve: "Breve",
      medio: "Medio",
      lungo: "Lungo",
      moderate: "Moderate",
      elevate: "Elevate",
      "scarsa aderenza": "Scarsa Aderenza",
      "scarsa fiducia": "Scarsa Fiducia",
      "drop-out": "Drop-out",
      "riduzione sintomi": "Riduzione Sintomi",
      "migliorare funzionamento": "Migliorare Funzionamento",
      "riduzione rischio": "Riduzione Rischio",
      "migliorare relazioni": "Migliorare Relazioni",
      "elaborare traumi": "Elaborare Traumi",
      "cessazione sostanze": "Cessazione Sostanze",
      "migliorare sonno": "Migliorare Sonno",
      SSRI: "SSRI",
      SNRI: "SNRI",
      antipsicotici: "Antipsicotici",
      "stabilizzatori dell'umore": "Stabilizzatori dell'Umore",
      benzodiazepine: "Benzodiazepine",
      altri: "Altri",
      parziale: "Parziale",
      scarsa: "Scarsa",
      intolleranza: "Intolleranza",
      nessuno: "Nessuno",
      "1": "1",
      "2-3": "2-3",
      piu_di_3: "Più di 3",
      piu_di_1: "Più di 1",
      buono: "Buono",
      scarso: "Scarso",
      assente: "Assente",
      alta: "Alta",
      media: "Media",
      ambivalente: "Ambivalente",
      "pre-contemplazione": "Pre-contemplazione",
      contemplazione: "Contemplazione",
      preparazione: "Preparazione",
      azione: "Azione",
      mantenimento: "Mantenimento",
      famiglia: "Famiglia",
      lavoro: "Lavoro",
      studio: "Studio",
      salute: "Salute",
      autonomia: "Autonomia",
      creatività: "Creatività",
      cura_di_se: "Cura di Sé",
      abbigliamento: "Abbigliamento",
      struttura_fisica: "Struttura Fisica",
      postura: "Postura",
      espressione_facciale: "Espressione Facciale",
      tono_voce: "Tono di Voce",
      gestualita_mimica: "Gestualità e Mimica",
      contatto_visivo: "Contatto Visivo",
      relazionalita_colloquio: "Relazionalità nel Colloquio",
      adeguata: "Adeguata",
      trascurata: "Trascurata",
      adeguato: "Adeguato",
      bizzarro: "Bizzarro",
      "non congruo": "Non Congruo",
      sottopeso: "Sottopeso",
      "sovrappeso/obesità": "Sovrappeso/Obesità",
      "segni di malattia": "Segni di Malattia",
      aperta: "Aperta",
      chiusa: "Chiusa",
      tesa: "Tesa",
      catatonica: "Catatonica",
      ricca: "Ricca",
      povera: "Povera",
      fissa: "Fissa",
      hiperespressiva: "Hiperespressiva",
      iperespressiva: "Iperespressiva",
      normale: "Normale",
      basso: "Basso",
      alto: "Alto",
      monotono: "Monotono",
      aumentata: "Aumentata",
      manierismi: "Manierismi",
      stereotipie: "Stereotipie",
      ridotto: "Ridotto",
      evitante: "Evitante",
      inibita: "Inibita",
      invadente: "Invadente",
      seduttiva: "Seduttiva",
      ostile: "Ostile",
      collaborante: "Collaborante",
      "non collaborante": "Non Collaborante",
      amichevole: "Amichevole",
      seduttivo: "Seduttivo",
      difensivo: "Difensivo",
      passivo: "Passivo",
      sospettoso: "Sospettoso",
      aggressivo: "Aggressivo",
      lucido: "Lucido",
      soporoso: "Soporoso",
      obnubilato: "Obnubilato",
      integro: "Integro",
      fluenza_contenuto: "Fluenza e Contenuto",
      fenomeni_associati: "Fenomeni Associati",
      spontaneo: "Spontaneo",
      fluente: "Fluente",
      rallentato: "Rallentato",
      povero: "Povero",
      stereotipato: "Stereotipato",
      logorroico: "Logorroico",
      ripetitivo: "Ripetitivo",
      incoerente: "Incoerente",
      "povertà di contenuto": "Povertà di Contenuto",
      "latenza aumentata": "Latenza Aumentata",
      schizofasia: "Schizofasia",
      ecolalia: "Ecolalia",
      neologismi: "Neologismi",
      paralogismi: "Paralogismi",
      umore: "Umore",
      affettivita_emotivita: "Affettività ed Emotività",
      correlati: "Correlati",
      partecipazione_emotiva: "Partecipazione Emotiva",
      eutimico: "Eutimico",
      sereno: "Sereno",
      fluttuante: "Fluttuante",
      vivace: "Vivace",
      sintona: "Sintona",
      disintonica: "Disintonica",
      piatta: "Piatta",
      coartata: "Coartata",
      angosciata: "Angosciata",
      apatica: "Apatia",
      "tristezza vitale": "Tristezza Vitale",
      "apatia/abulia/astenia": "Apatia/Abulia/Astenia",
      ambivalenza: "Ambivalenza",
      labilità: "Labilità",
      inadeguatezza: "Inadeguatezza",
      anedonia: "Anedonia",
      disforia: "Disforia",
      ipomania: "Ipomania",
      mania: "Mania",
      intensa: "Intensa",
      variata: "Variata",
      asincronica: "Asincronica",
      generalizzata: "Generalizzata",
      somatizzata: "Somatizzata",
      irrequietudine: "Irrequietudine",
      paura: "Paura",
      panico: "Panico",
      forma: "Forma",
      contenuti: "Contenuti",
      accelerato: "Accelerato",
      deragliato: "Deragliato",
      tangenziale: "Tangenziale",
      blocchi: "Blocchi",
      "idee prevalenti": "Idee Prevalenti",
      "idee dominanti": "Idee Dominanti",
      "deliri persecutori": "Deliri Persecutori",
      "deliri grandiosi": "Deliri Grandiosi",
      "deliri somatici": "Deliri Somatici",
      "deliri di gelosia": "Deliri di Gelosia",
      "deliri di colpa": "Deliri di Colpa",
      "deliri religiosi": "Deliri Religiosi",
      "nessuna alterazione": "Nessuna Alterazione",
      illusioni: "Illusioni",
      "allucinazioni uditive": "Allucinazioni Uditive",
      "allucinazioni visive": "Allucinazioni Visive",
      "allucinazioni olfattive": "Allucinazioni Olfattive",
      "allucinazioni tattili": "Allucinazioni Tattili",
      "allucinazioni cenestesiche": "Allucinazioni Cenestesiche",
      capacita_intellettive: "Capacità Intellettive",
      "sotto la norma": "Sotto la Norma",
      "sopra la norma": "Sopra la Norma",
      agitazione: "Agitazione",
      eccitamento: "Eccitamento",
      arresto: "Arresto",
      "catatonia/catatessia": "Catatonia/Catatessia",
      "automatismi al comando": "Automatismi al Comando",
      "negativismo (passivo)": "Negativismo (Passivo)",
      "negativismo (attivo)": "Negativismo (Attivo)",
      ecoprassia: "Ecoprassia",
      ecomimia: "Ecomimia",
      paleocinesie: "Paleocinesie",
      fuga: "Fuga",
      "tendenze autoaggressive": "Tendenze Autoaggressive",
      "tendenze eteroaggressive": "Tendenze Eteroaggressive",
      "azioni coatte": "Azioni Coatte",
      "rituali/cerimoniali": "Rituali/Cerimoniali",
      "chiede di parlare": "Chiede di Parlare",
      collaborativo: "Collaborativo",
      insistente: "Insistente",
      reticente: "Reticente",
      mutacico: "Mutacico",
      rifiuta: "Rifiuta",
      coscienza_malattia: "Coscienza di Malattia",
      giudizio: "Giudizio",
      incongrua: "Incongrua",
      conservato: "Conservato",
      compromesso: "Compromesso",
    };
    return names[value] ?? value;
  };

  /**
   * Render field based on its type and definition
   */
  const renderField = (
    fieldKey: string,
    fieldDef: FieldDefinition,
    level = 0,
  ) => {
    const isExpanded = expandedSubsections.has(fieldKey);
    const hasSubfields =
      fieldDef.properties && Object.keys(fieldDef.properties).length > 0;
    const hasEnumValues = fieldDef.enum && fieldDef.enum.length > 0;
    const isArray = fieldDef.type === "array";
    const indentationStyle =
      level > 0 ? { paddingLeft: `${level * 1.15}rem` } : undefined;
    const enumIndentationStyle = { paddingLeft: `${(level + 1) * 1.15}rem` };

    const indicator = hasSubfields ? (
      <span className="border-border-primary text-text-secondary flex h-6 w-6 items-center justify-center rounded-md border text-xs font-semibold">
        {isExpanded ? "−" : "+"}
      </span>
    ) : (
      <span className="text-text-tertiary flex h-6 w-6 items-center justify-center text-sm">
        •
      </span>
    );

    const fieldContent = (
      <>
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
          {indicator}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-text-primary truncate text-sm font-medium">
              {getFieldDisplayName(fieldKey)}
            </h4>
            {showFieldTypes && fieldDef.type && (
              <span className="pill pill--sm pill--accent flex-shrink-0">
                {fieldDef.type}
                {isArray && "[]"}
              </span>
            )}
          </div>
          {fieldDef.description && (
            <p className="text-text-secondary mt-1 line-clamp-2 text-xs">
              {fieldDef.description}
            </p>
          )}
        </div>
      </>
    );

    return (
      <li key={fieldKey} className="list-none space-y-1">
        {hasSubfields ? (
          <button
            type="button"
            onClick={() => toggleSubsection(fieldKey)}
            aria-expanded={isExpanded}
            style={indentationStyle}
            className="hover:bg-background-secondary/60 focus-visible:ring-primary-500/40 flex w-full items-start gap-2 rounded-md px-1 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {fieldContent}
          </button>
        ) : (
          <div
            style={indentationStyle}
            className="flex items-start gap-2 px-1 py-1.5"
          >
            {fieldContent}
          </div>
        )}

        {hasEnumValues && (
          <div style={enumIndentationStyle} className="mt-1.5">
            <div className="flex flex-wrap gap-1.5">
              {fieldDef.enum!.map((value) => (
                <span key={value} className="pill pill--sm pill--accent">
                  {getEnumDisplayName(value)}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasSubfields && isExpanded && (
          <ul className="mt-1.5 space-y-1.5" role="group">
            {Object.entries(fieldDef.properties!).map(
              ([subFieldKey, subFieldDef]) =>
                renderField(subFieldKey, subFieldDef, level + 1),
            )}
          </ul>
        )}
      </li>
    );
  };

  /**
   * Render section with all its fields
   */
  const renderSection = (sectionKey: string, sectionDef: SectionDefinition) => {
    const isExpanded = expandedSections.has(sectionKey);
    const hasFields =
      sectionDef.properties && Object.keys(sectionDef.properties).length > 0;

    return (
      <div
        key={sectionKey}
        className="dashboard-panel dashboard-panel--compact"
      >
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          aria-expanded={isExpanded}
          className={`focus-visible:ring-primary-500/40 flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none ${
            isExpanded
              ? "bg-background-secondary"
              : "bg-background-tertiary hover:bg-background-secondary"
          }`}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-text-primary text-sm font-semibold">
              {getSectionDisplayName(sectionKey)}
            </h3>
          </div>
          <span className="border-border-primary text-text-secondary ml-3 inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-semibold">
            {isExpanded ? "−" : "+"}
          </span>
        </button>

        {isExpanded && hasFields && (
          <ul className="mt-2 space-y-1.5" role="group">
            {Object.entries(sectionDef.properties!).map(
              ([fieldKey, fieldDef]) => renderField(fieldKey, fieldDef),
            )}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-panel-stack">
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h2 className="dashboard-section__title">
              Schema di Valutazione Psicologica Strutturata
            </h2>
            <p className="dashboard-section__description">
              Visualizza tutti i campi disponibili per la valutazione
              psicologica strutturata dei pazienti. Clicca sulle sezioni per
              espandere e visualizzare i dettagli dei campi.
            </p>
          </div>
        </div>

        {/* Search Bar and Controls */}
        <div className="mb-4 space-y-3">
          <div className="auth-input-group">
            <label htmlFor="patient-schema-search" className="auth-label">
              Cerca nello schema
            </label>
            <input
              id="patient-schema-search"
              type="text"
              placeholder="Digita parola chiave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="auth-input"
            />
          </div>
          <div className="text-text-tertiary flex flex-wrap items-center justify-between gap-2 text-xs">
            {searchTerm ? (
              <p>{filteredSections.length} sezioni trovate</p>
            ) : (
              <p>{filteredSections.length} sezioni totali</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setShowFieldTypes((prev) => !prev)}
              >
                {showFieldTypes ? "Nascondi tipi campo" : "Mostra tipi campo"}
              </button>
              <button
                onClick={toggleAllSections}
                type="button"
                className="btn btn-sm btn-ghost"
              >
                {allExpanded ? "Contrai tutto" : "Espandi tutto"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {filteredSections.map(([sectionKey, sectionDef]) =>
            renderSection(sectionKey, sectionDef),
          )}
        </div>

        {filteredSections.length === 0 && searchTerm && (
          <div className="py-8 text-center">
            <p className="text-text-tertiary">
              Nessuna sezione trovata per &quot;{searchTerm}&quot;
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
