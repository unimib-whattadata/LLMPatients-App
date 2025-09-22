/**
 * My Progress Content Component
 * 
 * Interface for viewing personal learning progress, achievements,
 * and skill development tracking across clinical simulations
 */

"use client";

import { useState } from "react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  category: "clinical" | "communication" | "emergency" | "academic";
}

interface SkillProgress {
  skill: string;
  current: number;
  target: number;
  category: string;
}

export function MyProgressContent() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Mock data - in real app this would come from API
  const achievements: Achievement[] = [
    {
      id: "1",
      title: "Primo Soccorso",
      description: "Completata prima simulazione di emergenza",
      icon: "[EMERGENCY]",
      unlockedAt: "2024-09-03",
      category: "emergency"
    },
    {
      id: "2",
      title: "Diagnostico Eccellente",
      description: "Score superiore a 90 in una diagnosi",
      icon: "[DIAGNOSIS]",
      unlockedAt: "2024-09-01",
      category: "clinical"
    },
    {
      id: "3",
      title: "Comunicatore Empatico",
      description: "Eccellenza nella comunicazione paziente",
      icon: "[COMMUNICATION]",
      unlockedAt: "2024-08-28",
      category: "communication"
    },
    {
      id: "4",
      title: "Studente Dedicato",
      description: "10 simulazioni completate",
      icon: "[STUDY]",
      unlockedAt: "2024-08-25",
      category: "academic"
    }
  ];

  const skillsProgress: SkillProgress[] = [
    { skill: "Diagnosi Differenziale", current: 75, target: 100, category: "Competenze Cliniche" },
    { skill: "Gestione Emergenze", current: 82, target: 100, category: "Competenze Cliniche" },
    { skill: "Comunicazione Paziente", current: 68, target: 100, category: "Soft Skills" },
    { skill: "Procedure Invasive", current: 70, target: 100, category: "Competenze Tecniche" },
    { skill: "Farmacologia", current: 85, target: 100, category: "Conoscenze Teoriche" },
    { skill: "Anatomia", current: 90, target: 100, category: "Conoscenze Teoriche" },
  ];

  const weeklyProgress = [
    { week: "Sett 1", simulations: 2, avgScore: 75 },
    { week: "Sett 2", simulations: 3, avgScore: 82 },
    { week: "Sett 3", simulations: 1, avgScore: 88 },
    { week: "Sett 4", simulations: 4, avgScore: 85 }
  ];

  const getCategoryIcon = (category: string) => {
    const icons = {
    communication: "[COMMUNICATION]", 
    emergency: "[EMERGENCY]",
    academic: "[STUDY]"
    };
    return icons[category as keyof typeof icons] || "[TROPHY]";
  };

  const filteredAchievements = selectedCategory === "all" 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const achievementBadgeClass: Record<Achievement["category"], string> = {
    clinical: "pill pill--sm pill--accent",
    communication: "pill pill--sm pill--success",
    emergency: "pill pill--sm pill--danger",
    academic: "pill pill--sm pill--accent",
  };

  const totalSimulations = 15;
  const completedSimulations = 12;
  const averageScore = 82;
  const totalHours = 45;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          I Miei Progressi
        </h1>
        <p className="text-text-secondary">
          Monitora il tuo percorso di apprendimento e i tuoi risultati
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-accent-600 mb-1">
                {completedSimulations}/{totalSimulations}
              </div>
              <div className="text-sm text-text-secondary">Simulazioni Completate</div>
            </div>
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-background-tertiary rounded-full h-2">
              <div 
                className="bg-accent-600 h-2 rounded-full"
                style={{ width: `${(completedSimulations / totalSimulations) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-success-600 mb-1">{averageScore}</div>
              <div className="text-sm text-text-secondary">Score Medio</div>
            </div>
            <div className="w-12 h-12 bg-success-50 rounded-lg flex items-center justify-center">
            </div>
          </div>
          <div className="mt-4 text-xs text-success-600">
            +5% rispetto al mese scorso
          </div>
        </div>

        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-accent-600 mb-1">{achievements.length}</div>
              <div className="text-sm text-text-secondary">Achievement Sbloccati</div>
            </div>
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
              [TROPHY]
            </div>
          </div>
        </div>

        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-secondary-600 mb-1">{totalHours}h</div>
              <div className="text-sm text-text-secondary">Ore di Studio</div>
            </div>
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
              [CLOCK]
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Skills Progress */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-6">
            Progressi per Competenza
          </h3>
          <div className="space-y-6">
            {skillsProgress.map((skill, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-medium text-text-primary">{skill.skill}</h4>
                    <p className="text-xs text-text-tertiary">{skill.category}</p>
                  </div>
                  <span className="text-sm font-bold text-text-primary">
                    {skill.current}/{skill.target}
                  </span>
                </div>
                <div className="w-full bg-background-tertiary rounded-full h-3">
                  <div 
                    className="bg-accent-500 h-3 rounded-full"
                    style={{ width: `${(skill.current / skill.target) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-text-primary">
              Achievement
            </h3>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tutti</option>
              <option value="clinical">Clinici</option>
              <option value="communication">Comunicazione</option>
              <option value="emergency">Emergenze</option>
              <option value="academic">Accademici</option>
            </select>
          </div>
          
          <div className="space-y-4">
            {filteredAchievements.map((achievement) => (
              <div key={achievement.id} className="flex items-start gap-4 p-4 bg-background-secondary rounded-lg">
                <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center text-2xl">
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary mb-1">
                    {achievement.title}
                  </h4>
                  <p className="text-sm text-text-secondary mb-2">
                    {achievement.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">
                      Sbloccato il {achievement.unlockedAt}
                    </span>
                    <span className={achievementBadgeClass[achievement.category]}>
                      {achievement.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="mt-8 bg-background-secondary rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">
          Progresso Settimanale
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {weeklyProgress.map((week, index) => (
            <div key={index} className="text-center">
              <div className="mb-4">
                <div className="w-full bg-background-tertiary rounded-lg h-32 flex flex-col justify-end p-2">
                  <div 
                    className="bg-accent-600 rounded-md"
                    style={{ height: `${(week.avgScore / 100) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-text-primary">{week.week}</div>
                <div className="text-text-secondary">{week.simulations} sim</div>
                <div className="text-accent-600 font-semibold">{week.avgScore}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Goals */}
      <div className="mt-8 bg-accent-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Prossimi Obiettivi
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-accent-600 rounded-full flex items-center justify-center">
              <span className="text-text-primary text-xs">1</span>
            </div>
            <span className="text-text-secondary">Completare 5 simulazioni di emergenza</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-success-600 rounded-full flex items-center justify-center">
              <span className="text-text-primary text-xs">2</span>
            </div>
            <span className="text-text-secondary">Raggiungere score medio di 85+</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-accent-600 rounded-full flex items-center justify-center">
              <span className="text-text-primary text-xs">3</span>
            </div>
            <span className="text-text-secondary">Sbloccare achievement Esperto Clinico</span>
          </div>
        </div>
      </div>
    </div>
  );
}
