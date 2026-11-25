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

// 90 -> "1 h 30 min"
export function fmtMinutes(min) {
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h ? `${h} h` : ''}${h && m ? ' ' : ''}${m || !h ? `${m} min` : ''}`;
}

export const fmtDate = (iso) =>
  new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
