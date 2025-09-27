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
      category: "emergency",
    },
    {
      id: "2",
      title: "Diagnostico Eccellente",
      description: "Score superiore a 90 in una diagnosi",
      icon: "[DIAGNOSIS]",
      unlockedAt: "2024-09-01",
      category: "clinical",
    },
    {
      id: "3",
      title: "Comunicatore Empatico",
      description: "Eccellenza nella comunicazione paziente",
      icon: "[COMMUNICATION]",
      unlockedAt: "2024-08-28",
      category: "communication",
    },
    {
      id: "4",
      title: "Studente Dedicato",
      description: "10 simulazioni completate",
      icon: "[STUDY]",
      unlockedAt: "2024-08-25",
      category: "academic",
    },
  ];

  const skillsProgress: SkillProgress[] = [
    {
      skill: "Diagnosi Differenziale",
      current: 75,
      target: 100,
      category: "Competenze Cliniche",
    },
    {
      skill: "Gestione Emergenze",
      current: 82,
      target: 100,
      category: "Competenze Cliniche",
    },
    {
      skill: "Comunicazione Paziente",
      current: 68,
      target: 100,
      category: "Soft Skills",
    },
    {
      skill: "Procedure Invasive",
      current: 70,
      target: 100,
      category: "Competenze Tecniche",
    },
    {
      skill: "Farmacologia",
      current: 85,
      target: 100,
      category: "Conoscenze Teoriche",
    },
    {
      skill: "Anatomia",
      current: 90,
      target: 100,
      category: "Conoscenze Teoriche",
    },
  ];

  const weeklyProgress = [
    { week: "Sett 1", simulations: 2, avgScore: 75 },
    { week: "Sett 2", simulations: 3, avgScore: 82 },
    { week: "Sett 3", simulations: 1, avgScore: 88 },
    { week: "Sett 4", simulations: 4, avgScore: 85 },
  ];


  const filteredAchievements =
    selectedCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

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
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-text-primary mb-2 text-3xl font-bold">
          I Miei Progressi
        </h1>
        <p className="text-text-secondary">
          Monitora il tuo percorso di apprendimento e i tuoi risultati
        </p>
      </div>

      {/* Progress Overview */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-accent-600 mb-1 text-2xl font-bold">
                {completedSimulations}/{totalSimulations}
              </div>
              <div className="text-text-secondary text-sm">
                Simulazioni Completate
              </div>
            </div>
            <div className="bg-accent-100 flex h-12 w-12 items-center justify-center rounded-lg"></div>
          </div>
          <div className="mt-4">
            <div className="bg-background-tertiary h-2 w-full rounded-full">
              <div
                className="bg-accent-600 progress-bar-dynamic h-2 rounded-full"
                style={{
                  width: `${(completedSimulations / totalSimulations) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-success-600 mb-1 text-2xl font-bold">
                {averageScore}
              </div>
              <div className="text-text-secondary text-sm">Score Medio</div>
            </div>
            <div className="bg-success-50 flex h-12 w-12 items-center justify-center rounded-lg"></div>
          </div>
          <div className="text-success-600 mt-4 text-xs">
            +5% rispetto al mese scorso
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-accent-600 mb-1 text-2xl font-bold">
                {achievements.length}
              </div>
              <div className="text-text-secondary text-sm">
                Achievement Sbloccati
              </div>
            </div>
            <div className="bg-accent-100 flex h-12 w-12 items-center justify-center rounded-lg">
              [TROPHY]
            </div>
          </div>
        </div>

        <div className="bg-background-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-secondary-600 mb-1 text-2xl font-bold">
                {totalHours}h
              </div>
              <div className="text-text-secondary text-sm">Ore di Studio</div>
            </div>
            <div className="bg-secondary-100 flex h-12 w-12 items-center justify-center rounded-lg">
              [CLOCK]
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Skills Progress */}
        <div className="bg-background-secondary rounded-lg p-6">
          <h3 className="text-text-primary mb-6 text-lg font-semibold">
            Progressi per Competenza
          </h3>
          <div className="space-y-6">
            {skillsProgress.map((skill, index) => (
              <div key={index}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-text-primary font-medium">
                      {skill.skill}
                    </h4>
                    <p className="text-text-tertiary text-xs">
                      {skill.category}
                    </p>
                  </div>
                  <span className="text-text-primary text-sm font-bold">
                    {skill.current}/{skill.target}
                  </span>
                </div>
                <div className="bg-background-tertiary h-3 w-full rounded-full">
                  <div
                    className="bg-accent-500 progress-bar-dynamic h-3 rounded-full"
                    style={{
                      width: `${(skill.current / skill.target) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-background-secondary rounded-lg p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-text-primary text-lg font-semibold">
              Achievement
            </h3>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="focus:ring-primary-500 rounded-md px-3 py-1 text-sm focus:ring-2 focus:outline-none"
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
              <div
                key={achievement.id}
                className="bg-background-secondary flex items-start gap-4 rounded-lg p-4"
              >
                <div className="bg-secondary-100 flex h-12 w-12 items-center justify-center rounded-lg text-2xl">
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-text-primary mb-1 font-medium">
                    {achievement.title}
                  </h4>
                  <p className="text-text-secondary mb-2 text-sm">
                    {achievement.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-text-tertiary text-xs">
                      Sbloccato il {achievement.unlockedAt}
                    </span>
                    <span
                      className={achievementBadgeClass[achievement.category]}
                    >
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
      <div className="bg-background-secondary mt-8 rounded-lg p-6">
        <h3 className="text-text-primary mb-6 text-lg font-semibold">
          Progresso Settimanale
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {weeklyProgress.map((week, index) => (
            <div key={index} className="text-center">
              <div className="mb-4">
                <div className="bg-background-tertiary flex h-32 w-full flex-col justify-end rounded-lg p-2">
                  <div
                    className="bg-accent-600 progress-bar-dynamic rounded-md"
                    style={{ height: `${(week.avgScore / 100) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm">
                <div className="text-text-primary font-medium">{week.week}</div>
                <div className="text-text-secondary">
                  {week.simulations} sim
                </div>
                <div className="text-accent-600 font-semibold">
                  {week.avgScore}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Goals */}
      <div className="bg-accent-50 mt-8 rounded-lg p-6">
        <h3 className="text-text-primary mb-4 text-lg font-semibold">
          Prossimi Obiettivi
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-accent-600 flex h-6 w-6 items-center justify-center rounded-full">
              <span className="text-text-primary text-xs">1</span>
            </div>
            <span className="text-text-secondary">
              Completare 5 simulazioni di emergenza
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-success-600 flex h-6 w-6 items-center justify-center rounded-full">
              <span className="text-text-primary text-xs">2</span>
            </div>
            <span className="text-text-secondary">
              Raggiungere score medio di 85+
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-accent-600 flex h-6 w-6 items-center justify-center rounded-full">
              <span className="text-text-primary text-xs">3</span>
            </div>
            <span className="text-text-secondary">
              Sbloccare achievement Esperto Clinico
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
