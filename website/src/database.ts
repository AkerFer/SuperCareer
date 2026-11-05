import roleGroups from "./data/fpl-role-groups.json";
import { setPlayerRoles, realRoleProfile } from "./player-roles";
import birthYears from "./data/birth-years.json";
import rosters from "./data/rosters.json";
import logos from "./data/logos.json";
import type { Game } from "./engine";
interface Entry {
  name: string;
  pos: string;
  born?: string | null;
  photo?: string;
  source: string;
}
export const databaseLabel =
  "Историческая база 2024/25: реальные имена; FC 26 OVR (снимок 19.09.2025) для 1337 игроков; остальные рейтинги, цены, бюджеты и недостающий возраст — игровые оценки. Составы разных дат сезона, не актуальная заявка 2026/27.";
export function applyRealDatabase(g: Game, preserveProgress = false) {
  const db = rosters as Record<string, Entry[]>;
  for (const c of g.clubs) {
    c.logo = (logos as Record<string, string>)[c.name];
    const original = g.players.filter(
      (p) => Math.floor(p.id / 22) === c.id && p.id < 2112,
    );
    const entries = db[c.name] ?? [];
    original.forEach((p, i) => {
      const e = entries[i];
      if (!e) {
        if (!preserveProgress) {
          p.age = 17 + (p.id % 3);
          p.rating = Math.max(40, p.rating - 8);
          p.source = "Сгенерированный выпускник академии";
        }
        return;
      }
      if (p.real) return;
      p.name = e.name;
      p.real = true;
      p.photo = e.photo;
      p.source = e.source;
      if (preserveProgress) p.ageEstimated = true;
      if (!preserveProgress) {
        p.pos = e.pos;
        const fplId = e.photo?.match(/\/p(\d+)\.png/)?.[1];
        const group = fplId
          ? (roleGroups as Record<string, string>)[fplId]
          : undefined;
        if (group && !realRoleProfile(p.name))
          p.pos = (
            { 1: "GK", 2: "DF", 3: "MF", 4: "FW" } as Record<string, string>
          )[group];
        setPlayerRoles(p);
        p.nation = "Не указана";
        const year = e.born
          ? new Date(e.born).getUTCFullYear()
          : (birthYears as Record<string, number>)[e.name];
        p.ageEstimated = !year;
        p.age = year ? Math.max(16, Math.min(40, g.season - year)) : 26;
        p.potential = Math.max(p.potential, p.rating);
      }
    });
  }
  g.database = "historical-2024-25-v2";
  g.news[0] = databaseLabel;
}
