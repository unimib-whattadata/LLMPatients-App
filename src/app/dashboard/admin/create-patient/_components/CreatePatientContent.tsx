/**
 * Create Patient Content Component
 * 
 * Interface for creating new patient cases and medical scenarios
 * for student clinical simulations
 */

"use client";

import { useState } from "react";

export function CreatePatientContent() {
  const [patientData, setPatientData] = useState({
    name: "",
    age: "",
    condition: "",
    symptoms: "",
    background: "",
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-stack">
        <section className="dashboard-section" aria-labelledby="create-patient-form">
          <div className="dashboard-section__header">
            <div>
              <h2 id="create-patient-form" className="dashboard-section__title">Dettagli Paziente</h2>
              <p className="dashboard-section__description">
                Inserisci le informazioni del paziente per creare un nuovo caso clinico
              </p>
            </div>
          </div>

          <div className="dashboard-panel">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="label" htmlFor="patient-name">
                    Nome Paziente
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    value={patientData.name}
                    onChange={(e) => setPatientData({...patientData, name: e.target.value})}
                    className="input-field"
                    placeholder="Inserisci il nome del paziente"
                  />
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="patient-age">
                    Età
                  </label>
                  <input
                    id="patient-age"
                    type="number"
                    value={patientData.age}
                    onChange={(e) => setPatientData({...patientData, age: e.target.value})}
                    className="input-field"
                    placeholder="Età del paziente"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label" htmlFor="patient-condition">
                  Condizione Medica
                </label>
                <input
                  id="patient-condition"
                  type="text"
                  value={patientData.condition}
                  onChange={(e) => setPatientData({...patientData, condition: e.target.value})}
                  className="input-field"
                  placeholder="Diagnosi o condizione principale"
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="patient-symptoms">
                  Sintomi Presentati
                </label>
                <textarea
                  id="patient-symptoms"
                  value={patientData.symptoms}
                  onChange={(e) => setPatientData({...patientData, symptoms: e.target.value})}
                  rows={4}
                  className="input-field"
                  placeholder="Descrivi i sintomi che il paziente presenta..."
                />
              </div>

              <div className="form-group">
                <label className="label" htmlFor="patient-background">
                  Storia Clinica
                </label>
                <textarea
                  id="patient-background"
                  value={patientData.background}
                  onChange={(e) => setPatientData({...patientData, background: e.target.value})}
                  rows={4}
                  className="input-field"
                  placeholder="Background medico e storia del paziente..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Salva Paziente
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="recent-patients">
          <div className="dashboard-section__header">
            <div>
              <h2 id="recent-patients" className="dashboard-section__title">Pazienti Recenti</h2>
              <p className="dashboard-section__description">
                Ultimi pazienti creati per riferimento rapido
              </p>
            </div>
          </div>

          <div className="dashboard-list" role="list">
            <div className="dashboard-list__item" role="listitem">
              <div>
                <div className="dashboard-activity-title">Mario Rossi</div>
                <div className="dashboard-activity-meta">Età: 45 - Ipertensione</div>
              </div>
              <button className="btn btn-sm btn-outline">
                Modifica
              </button>
            </div>
            <div className="dashboard-list__item" role="listitem">
              <div>
                <div className="dashboard-activity-title">Laura Bianchi</div>
                <div className="dashboard-activity-meta">Età: 32 - Diabete Tipo 1</div>
              </div>
              <button className="btn btn-sm btn-outline">
                Modifica
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}