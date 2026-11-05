import fplGroups from "./data/fpl-role-groups.json";
import type { Player } from "./engine";
export const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const profiles: Record<string, string[]> = {};
function add(names: string, roles: string[]) {
  for (const name of names.split("|")) profiles[normalizeName(name)] = roles;
}
add("Bukayo Saka", ["RW", "RM"]);
add("Martin Ødegaard", ["CAM", "CM"]);
add("Declan Rice", ["CM", "CDM"]);
add("Thomas Partey", ["CDM", "CM", "RB"]);
add("Mikel Merino", ["CM", "CDM"]);
add("Leandro Trossard", ["LW", "ST", "CAM"]);
add("Kai Havertz", ["ST", "CAM", "CM"]);
add("Gabriel Martinelli Silva|Gabriel Martinelli", ["LW", "RW"]);
add("Gabriel Fernando de Jesus|Gabriel Jesus", ["ST", "RW"]);
add("William Saliba", ["CB"]);
add("Gabriel dos Santos Magalhães|Gabriel Magalhães", ["CB"]);
add("Jurriën Timber", ["RB", "CB", "LB"]);
add("Riccardo Calafiori", ["LB", "CB"]);
add("Jakub Kiwior", ["CB", "LB"]);
add("Benjamin White|Ben White", ["RB", "CB"]);
add("Oleksandr Zinchenko", ["LB", "CM"]);
add("Kieran Tierney", ["LB", "CB"]);
add("Myles Lewis-Skelly", ["LB", "CM"]);
add("Cole Palmer", ["CAM", "RW"]);
add(
  "Alex Palmer|André Onana|Alisson Ramses Becker|Alisson|David Raya Martin|David Raya|Norberto Murara Neto|Robert Sánchez|Filip Jørgensen|Ederson Santana de Moraes|Stefan Ortega Moreno|Emiliano Martínez Romero|Emiliano Martínez|Guglielmo Vicario|Fraser Forster|Caoimhin Kelleher|Altay Bayindir|Robin Olsen",
  ["GK"],
);
add(
  "Amadou Onana|Boubacar Kamara|Manuel Ugarte|Carlos Henrique Casimiro|Casemiro|Roméo Lavia|Yves Bissouma",
  ["CDM", "CM"],
);
add("Lisandro Martínez", ["CB", "LB"]);
add("Lautaro Martínez", ["ST"]);
add("Bruno Borges Fernandes|Bruno Fernandes", ["CAM", "CM"]);
add("Noussair Mazraoui", ["RB", "LB"]);
add("Diogo Dalot Teixeira|Diogo Dalot", ["RB", "LB"]);
add(
  "Matthijs de Ligt|Harry Maguire|Leny Yoro|Victor Lindelöf|Pau Torres|Tyrone Mings|Diego Carlos Santos Silva|Axel Disasi|Tosin Adarabioyo|Wesley Fofana|Benoît Badiashile",
  ["CB"],
);
add("Patrick Dorgu", ["LWB", "LB", "LW"]);
add("Amad Diallo", ["RW", "CAM"]);
add("Kobbie Mainoo", ["CM", "CDM"]);
add("Christian Eriksen", ["CM", "CAM"]);
add("Mason Mount", ["CAM", "CM"]);
add("Alejandro Garnacho", ["LW", "RW"]);
add("Rasmus Højlund|Chido Obi-Martin|Ethan Wheatley|Ollie Watkins|Jhon Durán", [
  "ST",
]);
add("Joshua Zirkzee", ["ST", "CF"]);
add("Ezri Konsa Ngoyo", ["CB", "RB"]);
add("Lucas Digne|Ian Maatsen", ["LB", "LWB"]);
add("Matty Cash", ["RB", "RWB"]);
add("Morgan Rogers", ["CAM", "LW"]);
add("Youri Tielemans", ["CM", "CDM"]);
add("John McGinn", ["CM", "CAM", "LM"]);
add("Jacob Ramsey", ["CM", "LM"]);
add("Marcus Rashford", ["LW", "ST"]);
add("Leon Bailey", ["RW", "LW"]);
add("Levi Colwill", ["CB", "LB"]);
add("Marc Cucurella Saseta|Marc Cucurella", ["LB", "LWB"]);
add("Trevoh Chalobah", ["CB", "RB"]);
add("Malo Gusto|Reece James", ["RB", "RWB"]);
add("Moisés Caicedo Corozo|Moisés Caicedo", ["CDM", "CM"]);
add("Enzo Fernández", ["CM", "CDM"]);
add("Pedro Lomba Neto|Pedro Neto|Jadon Sancho", ["LW", "RW"]);
add("Noni Madueke", ["RW"]);
add("Christopher Nkunku", ["CAM", "ST", "CF"]);
add(
  "Nicolas Jackson|Marc Guiu Paz|Shumaira Mheuka|Romelu Lukaku Bolingoli|Romelu Lukaku",
  ["ST"],
);
add(
  "Virgil van Dijk|Ibrahima Konaté|Jarell Quansah|Rúben Gato Alves Dias|Abdukodir Khusanov|Cristian Romero|Radu Drăgușin|Kevin Danso",
  ["CB"],
);
add("Andrew Robertson|Konstantinos Tsimikas|Destiny Udogie", ["LB", "LWB"]);
add("Trent Alexander-Arnold", ["RB", "CM"]);
add("Conor Bradley|Pedro Porro", ["RB", "RWB"]);
add("Joe Gomez|Manuel Akanji", ["CB", "RB", "LB"]);
add("Mohamed Salah", ["RW"]);
add("Ryan Gravenberch", ["CDM", "CM"]);
add("Alexis Mac Allister", ["CM", "CAM", "CDM"]);
add("Dominik Szoboszlai", ["CM", "CAM"]);
add("Luis Díaz", ["LW"]);
add("Curtis Jones", ["CM", "CAM"]);
add("Diogo Teixeira da Silva|Diogo Jota", ["ST", "LW"]);
add("Harvey Elliott", ["CAM", "RW", "CM"]);
add("Cody Gakpo", ["LW", "ST"]);
add(
  "Darwin Núñez Ribeiro|Darwin Núñez|Jayden Danns|Erling Haaland|Divin Mubama",
  ["ST"],
);
add("Joško Gvardiol|Nathan Aké|Micky van de Ven|Ben Davies", ["CB", "LB"]);
add("Rico Lewis", ["RB", "CM", "CDM"]);
add("Kyle Walker", ["RB", "CB"]);
add("John Stones", ["CB", "CDM"]);
add("Bernardo Veiga de Carvalho e Silva|Bernardo Silva", ["CM", "RW", "CAM"]);
add("Ilkay Gündogan|Mateo Kovačić", ["CM", "CDM"]);
add("Phil Foden", ["CAM", "RW", "LW"]);
add("Sávio 'Savinho' Moreira de Oliveira|Savinho", ["RW", "LW"]);
add("Kevin De Bruyne", ["CM", "CAM"]);
add("Matheus Luiz Nunes", ["CM", "RB"]);
add("Jérémy Doku", ["LW", "RW"]);
add("Omar Marmoush", ["ST", "LW"]);
add("Julián Álvarez", ["ST", "CF", "CAM"]);
add("Djed Spence", ["RB", "LB"]);
add("Dejan Kulusevski", ["RW", "CAM", "CM"]);
add("Brennan Johnson", ["RW", "LW"]);
add("Son Heung-min", ["LW", "ST"]);
add("Pape Matar Sarr|Rodrigo Bentancur", ["CM", "CDM"]);
add("James Maddison", ["CAM", "CM"]);
add("Archie Gray", ["CM", "RB"]);
add("Dominic Solanke-Mitchell|Dominic Solanke|Dane Scarlett|Will Lankshear", [
  "ST",
]);
add("Richarlison de Andrade|Richarlison", ["ST", "LW"]);
add("Kylian Mbappé", ["ST", "LW"]);
add("Vinícius Júnior", ["LW", "ST"]);
add("Rodrygo", ["RW", "LW", "ST"]);
add("Jude Bellingham", ["CAM", "CM"]);
add("Federico Valverde", ["CM", "RM"]);
add("Aurélien Tchouaméni", ["CDM", "CB"]);
add("Eduardo Camavinga", ["CM", "CDM", "LB"]);
add("Arda Güler", ["CAM", "RW"]);
add("Brahim Díaz", ["CAM", "RW"]);
add("Luka Modrić|Dani Ceballos", ["CM", "CAM"]);
add("David Alaba", ["CB", "LB"]);
add("Lucas Vázquez", ["RB", "RW"]);
add("Lamine Yamal", ["RW"]);
add("Raphinha", ["LW", "RW"]);
add("Ferran Torres", ["ST", "LW", "RW"]);
add("Pedri|Gavi", ["CM", "CAM"]);
add("Dani Olmo", ["CAM", "LW"]);
add("Jules Koundé", ["RB", "CB"]);
add("Andreas Christensen", ["CB", "CDM"]);
add("Eric García", ["CB", "CDM"]);
add("Fermín López", ["CAM", "CM"]);
add("Antoine Griezmann", ["CF", "ST", "CAM"]);
add("Marcos Llorente", ["CM", "RWB", "RM"]);
add("Axel Witsel", ["CB", "CDM"]);
add("César Azpilicueta", ["CB", "RB"]);
add("Jamal Musiala|Florian Wirtz|Xavi Simons", ["CAM", "LW", "CM"]);
add("Joshua Kimmich", ["CDM", "CM", "RB"]);
add("Konrad Laimer", ["CM", "RB"]);
add("Raphaël Guerreiro", ["LB", "CM"]);
add("Thomas Müller", ["CF", "CAM", "ST"]);
add("Michael Olise", ["RW", "CAM"]);
add("Leroy Sané|Kingsley Coman|Serge Gnabry", ["LW", "RW"]);
add("Julian Brandt", ["CAM", "CM"]);
add("Karim Adeyemi", ["LW", "ST"]);
add("Julian Ryerson", ["RB", "LB"]);
add("Pascal Groß", ["CM", "CDM"]);
add("Emre Can", ["CDM", "CB"]);
add("Denzel Dumfries|Jeremie Frimpong", ["RWB", "RB", "RM"]);
add("Federico Dimarco|Robin Gosens|Alejandro Grimaldo", ["LWB", "LB", "LM"]);
add("Hakan Çalhanoğlu", ["CDM", "CM"]);
add("Matteo Darmian", ["RB", "CB", "RWB"]);
add("Rafael Leão", ["LW", "ST"]);
add("Christian Pulisic", ["RW", "CAM", "LW"]);
add("Paulo Dybala", ["CF", "CAM", "ST"]);
add("Kenan Yıldız", ["LW", "CAM"]);
add("Ousmane Dembélé", ["RW", "ST", "LW"]);
add("Désiré Doué", ["LW", "CAM", "RW"]);
add("Lee Kang-in", ["CAM", "RW", "CM"]);
add("Achraf Hakimi", ["RB", "RWB"]);
add("Warren Zaïre-Emery", ["CM", "CDM"]);
add("Senny Mayulu", ["CM", "CAM"]);
add("Gonçalo Ramos", ["ST"]);
export function realRoleProfile(name: string) {
  return profiles[normalizeName(name)];
}
export function playerPositions(p: Pick<Player, "pos" | "positions">) {
  return [...new Set([p.pos, ...(p.positions ?? [])])];
}
export function setPlayerRoles(p: Player) {
  const profile = p.real ? realRoleProfile(p.name) : undefined;
  if (profile) {
    p.pos = profile[0];
    p.positions = [...profile];
    p.positionSource = "Редакционный профиль реальных амплуа";
  } else {
    const code = p.photo?.match(/\/p(\d+)\.png/)?.[1];
    const group = code
      ? (fplGroups as Record<string, string>)[code]
      : undefined;
    if (p.real && group) {
      p.pos = (
        { 1: "GK", 2: "DF", 3: "MF", 4: "FW" } as Record<string, string>
      )[group];
      p.positionSource = "FPL: широкая группа; точная роль не подтверждена";
      p.positions = [p.pos];
    } else p.positions ??= [p.pos];
  }
}
