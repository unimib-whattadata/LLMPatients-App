/**
 * Central type definitions for the application
 * 
 * This file serves as a central hub for type exports, making it easier
 * to import commonly used types throughout the application.
 */

// Navigation and user management types
export type { User, ImpersonationContext, AdminViewMode, NavItem } from '../components/navigation/Navbar';

// API and data model types
export type { Patient } from '../server/api/routers/patients';
export type { TherapySession } from '../server/api/routers/therapy-sessions';

// React types
export type { ReactNode } from 'react';
