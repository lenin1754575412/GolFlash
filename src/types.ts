export type Section = 'Partidos' | 'Favorito' | 'Explorar' | 'Fichaje' | 'Noticia';
export type Status = 'scheduled' | 'live' | 'finished' | 'postponed';

export type Match = {
  id: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  status: Status;
  statusText: string;
  minute?: string;
  league: string;
  leagueCode: string;
  venue?: string;
  link?: string;
  source: 'ESPN' | 'TheSportsDB';
};

export type Article = {
  id: string;
  title: string;
  description: string;
  image?: string;
  published?: string;
  link: string;
  source: 'ESPN';
  league: string;
  isTransfer: boolean;
};

export type MatchResult = {
  matches: Match[];
  source: string;
  warning?: string;
};
