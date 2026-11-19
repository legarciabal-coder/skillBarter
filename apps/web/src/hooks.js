import { useEffect, useState } from 'react';
import { api } from './api';

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const STATUS = {
  open: 'Abierta', matched: 'Asignada', fulfilled: 'Cumplida', cancelled: 'Cancelada',
  pending: 'Pendiente', accepted: 'Aceptada', rejected: 'Rechazada', completed: 'Completada',
};
export const LEVELS = { beginner: 'Básico', intermediate: 'Intermedio', advanced: 'Avanzado' };

// Carga el catálogo de habilidades una vez por componente.
export function useSkills() {
  const [skills, setSkills] = useState([]);
  useEffect(() => {
    api('/api/skills').then(setSkills).catch(() => setSkills([]));
  }, []);
  const byId = Object.fromEntries(skills.map((s) => [s.id, s]));
  return { skills, byId };
}
