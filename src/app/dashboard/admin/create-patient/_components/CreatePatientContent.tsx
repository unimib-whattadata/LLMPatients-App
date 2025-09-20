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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Crea Nuovo Paziente
        </h1>
        <p className="text-gray-600">
          Crea un nuovo caso clinico per le simulazioni degli studenti
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Paziente
              </label>
              <input
                type="text"
                value={patientData.name}
                onChange={(e) => setPatientData({...patientData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Inserisci il nome del paziente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Età
              </label>
              <input
                type="number"
                value={patientData.age}
                onChange={(e) => setPatientData({...patientData, age: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Età del paziente"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condizione Medica
            </label>
            <input
              type="text"
              value={patientData.condition}
              onChange={(e) => setPatientData({...patientData, condition: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Diagnosi o condizione principale"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sintomi Presentati
            </label>
            <textarea
              value={patientData.symptoms}
              onChange={(e) => setPatientData({...patientData, symptoms: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrivi i sintomi che il paziente presenta..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storia Clinica
            </label>
            <textarea
              value={patientData.background}
              onChange={(e) => setPatientData({...patientData, background: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Background medico e storia del paziente..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              Salva Paziente
            </button>
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pazienti Recenti
        </h3>
        <div className="space-y-3">
          {/* Placeholder for recent patients */}
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-900">Mario Rossi</h4>
                <p className="text-sm text-gray-600">Età: 45 - Ipertensione</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm">
                Modifica
              </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-md border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-900">Laura Bianchi</h4>
                <p className="text-sm text-gray-600">Età: 32 - Diabete Tipo 1</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm">
                Modifica
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}