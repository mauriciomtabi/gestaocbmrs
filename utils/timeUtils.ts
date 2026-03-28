
export const calculateDuration = (entry: string, exit: string): number => {
  const [h1, m1] = entry.split(':').map(Number);
  const [h2, m2] = exit.split(':').map(Number);
  const start = h1 * 60 + m1;
  const end = h2 * 60 + m2;
  return Math.max(0, end - start);
};

export const formatMinutesToHHMM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const formatDateBR = (isoDate: string): string => {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

export const getDayOfWeekBR = (isoDate: string): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  return days[date.getDay()];
};

export const getLatestVisit = (records: { date: string }[]): string => {
  if (records.length === 0) return '';
  return [...records].sort((a, b) => b.date.localeCompare(a.date))[0].date;
};

export const getDaysInactivity = (lastDate: string): number => {
  if (!lastDate) return 999;
  // lastDate is YYYY-MM-DD
  const parts = lastDate.split('T')[0].split('-');
  if (parts.length !== 3) return 999;
  
  const [y, m, d] = parts.map(Number);
  const last = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - last.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const formatInactivityMessage = (days: number): string => {
  if (days < 7) return '';
  
  if (days >= 30) {
    const months = Math.floor(days / 30);
    if (months === 1) return '1 mês sem registro';
    return `${months} meses sem registro`;
  }
  
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 semana sem registro';
  return `${weeks} semanas sem registro`;
};

/**
 * Remove sufixos automáticos de digitalização ou sistemas, como carimbos de hora e IDs.
 */
export const sanitizeObservations = (text: string | undefined): string => {
  if (!text) return '';
  const systemFooterPattern = /\s*\d{7,}.*?\d{2}\/\d{2}\/\d{2,4}.*$/g;
  return text.replace(systemFooterPattern, '').trim();
};
