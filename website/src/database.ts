import birthYears from "./data/birth-years.json";
import rosters from "./data/rosters.json";
import logos from "./data/logos.json";
import type { Game } from "./engine";
const starRoles: Record<string, [string, number]> = {
  Saka: ["RW", 88],
  Ødegaard: ["CAM", 88],
  Havertz: ["ST", 84],
  Martinelli: ["LW", 83],
  Rice: ["CM", 87],
  Calafiori: ["LB", 81],
  Saliba: ["CB", 87],
  Magalhães: ["CB", 86],
  Timber: ["RB", 82],
  White: ["RB", 83],
  Haaland: ["ST", 92],
  Foden: ["CAM", 88],
  "De Bruyne": ["CM", 89],
  Rodri: ["CDM", 91],
  "Bernardo Silva": ["CM", 87],
  Doku: ["LW", 82],
  Grealish: ["LW", 83],
  Gvardiol: ["LB", 85],
  Salah: ["RW", 91],
  "Santos Gato Alves Dias": ["LW", 85],
  "van Dijk": ["CB", 90],
  "Alexander-Arnold": ["RB", 86],
  Robertson: ["LB", 84],
  "Mac Allister": ["CM", 86],
  Gravenberch: ["CDM", 84],
  Szoboszlai: ["CM", 84],
  Alisson: ["GK", 89],
  Palmer: ["CAM", 88],
  Caicedo: ["CDM", 86],
  Fernández: ["CM", 85],
  Jackson: ["ST", 82],
  Madueke: ["RW", 81],
  Sancho: ["LW", 81],
  Isak: ["ST", 88],
  Gordon: ["LW", 83],
  "Bruno Guimarães": ["CM", 86],
  Tonali: ["CM", 85],
  Trippier: ["RB", 82],
  Fernandes: ["CAM", 87],
  Rashford: ["LW", 83],
  Onana: ["GK", 83],
  Mazraoui: ["RB", 82],
  Dalot: ["RB", 82],
  Mainoo: ["CM", 81],
  Watkins: ["ST", 86],
  Rogers: ["CAM", 82],
  Tielemans: ["CM", 84],
  Martínez: ["GK", 87],
  Son: ["LW", 87],
  "Son Heung-min": ["LW", 87],
  Maddison: ["CAM", 84],
  Solanke: ["ST", 83],
  Kulusevski: ["RW", 84],
  Mbappé: ["ST", 92],
  "Vinícius Júnior": ["LW", 91],
  Bellingham: ["CAM", 90],
  Valverde: ["CM", 89],
  Courtois: ["GK", 90],
  Yamal: ["RW", 88],
  Lewandowski: ["ST", 89],
  Raphinha: ["LW", 88],
  Pedri: ["CM", 88],
  "Harry Kane": ["ST", 91],
  Musiala: ["CAM", 89],
  Wirtz: ["CAM", 89],
  Dembélé: ["RW", 89],
  "Lautaro Martínez": ["ST", 90],
};
interface Entry {
  name: string;
  pos: string;
  born?: string | null;
  photo?: string;
  source: string;
}
export const databaseLabel =
  "Историческая база 2024/25: реальные имена; рейтинги, бюджеты и недостающий возраст — игровые оценки. Составы разных дат сезона, не актуальная заявка 2026/27.";
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
        for (const [name, [pos, rating]] of Object.entries(starRoles)) {
          if (p.name.endsWith(name)) {
            p.pos = pos;
            p.rating = rating;
            p.potential = Math.max(p.potential, rating);
          }
        }
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
