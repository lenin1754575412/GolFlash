import { jsonFetch } from './football';

export type Player = { id: string; name: string; position: string; number?: string; image?: string; age?: number; nationality?: string };

export async function getTeamPlayers(league: string, teamId: string): Promise<Player[]> {
  if (!/^[a-z0-9.]+$/i.test(league) || !/^\d+$/.test(teamId)) throw new Error('Equipo no compatible');
  const data = await jsonFetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${teamId}/roster`);
  const groups = Array.isArray(data?.athletes) ? data.athletes : [];
  const athletes = groups.flatMap((g: any) => Array.isArray(g?.items) ? g.items : g?.id ? [g] : []);
  return athletes.map((a: any) => ({
    id: String(a.id || a.uid || a.displayName), name: String(a.displayName || a.fullName || a.name || 'Jugador'),
    position: String(a.position?.displayName || a.position?.abbreviation || 'Sin posición'),
    number: a.jersey ? String(a.jersey) : undefined,
    image: a.headshot?.href || undefined,
    age: typeof a.age === 'number' ? a.age : undefined,
    nationality: a.citizenship || a.birthPlace?.country || undefined,
  })).filter((a: Player) => a.name !== 'Jugador');
}
