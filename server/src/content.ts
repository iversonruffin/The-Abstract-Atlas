// ---------------------------------------------------------------------------
// Server-side copy of the game content, INCLUDING the correct answers.
//
// The frontend's data/game-data.ts ships correctIndex to the browser, so anyone
// could read it. Here the answers stay on the server; the API only ever sends
// prompts and (shuffled) choices.
//
// Keep ids in sync with baltimore-artifact-hunt/src/app/data/game-data.ts.
// Trivia text below is the same PLACEHOLDER copy as the frontend.
// ---------------------------------------------------------------------------

export interface Question {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  timeLimitSeconds: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Hotspot {
  id: string;
  locationId: string;
  name: string;
  badge: Badge;
  questions: Question[];
}

export interface Location {
  id: string;
  name: string;
  tagline: string;
  hotspotIds: string[];
  /** Guests (no account) can play this location. Everything else needs an account. */
  guestAccessible: boolean;
}

export const LOCATIONS: Location[] = [
  {
    id: 'federal-hill',
    name: 'Federal Hill',
    tagline: 'Rowhouses, a hilltop park, and harbor views',
    hotspotIds: ['federal-hill-beacon'],
    guestAccessible: true,
  },
  {
    id: 'inner-harbor',
    name: 'Inner Harbor',
    tagline: "Baltimore's historic waterfront heart",
    hotspotIds: ['inner-harbor-beacon'],
    guestAccessible: false,
  },
  {
    id: 'pigtown',
    name: 'Pigtown',
    tagline: "Baltimore's old railroad and stockyard district",
    hotspotIds: ['pigtown-beacon'],
    guestAccessible: false,
  },
  // ---- Charlotte (account-only, like every non-Federal-Hill location) ----
  {
    id: 'uptown',
    name: 'Uptown',
    tagline: "Charlotte's skyline, the Queen City's core",
    hotspotIds: ['uptown-beacon'],
    guestAccessible: false,
  },
  {
    id: 'university',
    name: 'University',
    tagline: 'Campus life and University City',
    hotspotIds: ['university-beacon'],
    guestAccessible: false,
  },
  {
    id: 'noda',
    name: 'NoDa',
    tagline: "Charlotte's arts district, in an old mill village",
    hotspotIds: ['noda-beacon'],
    guestAccessible: false,
  },
];

function q(id: string, prompt: string, choices: string[], correctIndex: number): Question {
  return { id, prompt, choices, correctIndex, timeLimitSeconds: 10 };
}

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'federal-hill-beacon',
    locationId: 'federal-hill',
    name: 'Federal Hill',
    badge: {
      id: 'hilltop-adventurer',
      name: 'Hilltop Adventurer',
      icon: '⛰️',
      description: 'Awarded for completing the Federal Hill challenge.',
    },
    questions: [
      q('fh-1', 'Federal Hill Park is best known for offering:', ['Harbor skyline views', 'Ski slopes', 'Desert dunes', 'A working farm'], 0),
      q('fh-2', 'Federal Hill sits on top of a:', ['Bluff / hill', 'Bridge', 'Tunnel', 'Pier'], 0),
      q('fh-3', 'Historically, Federal Hill was used as a:', ['Lookout point', 'Landing strip', 'Coal mine', 'Racetrack'], 0),
      q('fh-4', 'The neighborhood around Federal Hill is known for its:', ['Rowhouses', 'Skyscrapers', 'Vineyards', 'Wind farms'], 0),
      q('fh-5', 'Federal Hill overlooks which body of water?', ['The harbor', 'The Chesapeake Bay bridge', 'A mountain lake', 'The Susquehanna'], 0),
    ],
  },
  {
    id: 'inner-harbor-beacon',
    locationId: 'inner-harbor',
    name: 'Inner Harbor',
    badge: {
      id: 'harbor-hero',
      name: 'Harbor Hero',
      icon: '🏆',
      description: 'Awarded for completing the Inner Harbor challenge.',
    },
    questions: [
      q('ih-1', 'In what year was the Inner Harbor area founded?', ['1629', '1729', '1829', '1929'], 1),
      q('ih-2', 'What once operated along the Inner Harbor before it became a promenade?', ['A working port', 'A railyard', 'A mining camp', 'A racetrack'], 0),
      q('ih-3', 'Which of these is found ringing the Inner Harbor today?', ['Museums and pavilions', 'Vineyards', 'Ski lifts', 'Coal plants'], 0),
      q('ih-4', 'The Inner Harbor is best described as:', ['A desert oasis', "Baltimore's historic waterfront", 'A mountain pass', 'An airport district'], 1),
      q('ih-5', 'Local legend says sailors watch the water at dusk for:', ['A whale breach', 'An answering blink of light', 'A meteor shower', 'A foghorn choir'], 1),
    ],
  },
  {
    id: 'pigtown-beacon',
    locationId: 'pigtown',
    name: 'Pigtown',
    badge: {
      id: 'oink-patroller',
      name: 'Oink Patroller',
      icon: '🐖',
      description: 'Awarded for completing the Pigtown challenge.',
    },
    questions: [
      q('pt-1', 'Pigtown got its name from nearby:', ['Stockyards', 'Vineyards', 'Shipyards', 'Coal yards'], 0),
      q('pt-2', 'Which railroad is historically tied to Pigtown?', ['B&O Railroad', 'Amtrak Acela', 'Union Pacific', 'Orient Express'], 0),
      q('pt-3', 'Livestock in old Pigtown were driven toward:', ['Slaughterhouses', 'The harbor docks', 'A racetrack', 'A church fair'], 0),
      q('pt-4', 'Pigtown is a neighborhood in which city?', ['Baltimore', 'Philadelphia', 'Richmond', 'Pittsburgh'], 0),
      q('pt-5', "Pigtown's history is most tied to which century?", ['19th century', '21st century', '17th century', '12th century'], 0),
    ],
  },
  // ---- Charlotte. Trivia is a first draft: fact-check before launch (same as the Baltimore placeholders). ----
  {
    id: 'uptown-beacon',
    locationId: 'uptown',
    name: 'Uptown',
    badge: {
      id: 'queen-city-climber',
      name: 'Queen City Climber',
      icon: '🏙️',
      description: 'Awarded for completing the Uptown challenge.',
    },
    questions: [
      q('up-1', 'Charlotte is nicknamed the:', ['Queen City', 'Steel City', 'Motor City', 'Windy City'], 0),
      q('up-2', "Charlotte was named for the wife of which British king?", ['George III', 'Henry VIII', 'Louis XIV', 'Charles II'], 0),
      q('up-3', "Charlotte's downtown core is commonly called:", ['Uptown', 'Midtown', 'Overtown', 'Crosstown'], 0),
      q('up-4', "The two main streets that cross at the center of Uptown are Trade Street and:", ['Tryon Street', 'Elm Street', 'Maple Street', 'Peachtree Street'], 0),
      q('up-5', 'Charlotte is the county seat of which county?', ['Mecklenburg', 'Wake', 'Guilford', 'Durham'], 0),
    ],
  },
  {
    id: 'university-beacon',
    locationId: 'university',
    name: 'University',
    badge: {
      id: 'campus-scholar',
      name: 'Campus Scholar',
      icon: '🎓',
      description: 'Awarded for completing the University challenge.',
    },
    questions: [
      q('un-1', "UNC Charlotte's athletic teams are called the:", ['49ers', 'Tar Heels', 'Wolfpack', 'Blue Devils'], 0),
      q('un-2', "The '49ers' name nods to which part of the region's history?", ['The gold rush', 'The railroad boom', 'The tobacco trade', 'The shipbuilding era'], 0),
      q('un-3', 'UNC Charlotte began in 1946 as a college center for returning:', ['World War II veterans', 'Bank employees', 'Textile workers', 'Race car drivers'], 0),
      q('un-4', 'The area around the campus, north of Uptown, is often called:', ['University City', 'Old Town', 'Harbor District', 'The Heights'], 0),
      q('un-5', 'Which light rail line was extended to UNC Charlotte in 2018?', ['LYNX Blue Line', 'The Red Line', 'The Orange Line', 'The Gold Line'], 0),
    ],
  },
  {
    id: 'noda-beacon',
    locationId: 'noda',
    name: 'NoDa',
    badge: {
      id: 'noda-artist',
      name: 'NoDa Artist',
      icon: '🎨',
      description: 'Awarded for completing the NoDa challenge.',
    },
    questions: [
      q('nd-1', 'NoDa is short for:', ['North Davidson', 'North Dallas', 'New Downtown', 'Northern Docks'], 0),
      q('nd-2', 'NoDa is best known as an:', ['Arts district', 'Airport district', 'Stockyard district', 'Financial district'], 0),
      q('nd-3', "NoDa grew around a historic:", ['Textile mill village', 'Shipyard', 'Gold mine', 'Racetrack'], 0),
      q('nd-4', "Which crop's textile industry built the mill villages around Charlotte?", ['Cotton', 'Sugar cane', 'Rice', 'Wheat'], 0),
      q('nd-5', 'Today NoDa is popular for:', ['Galleries, breweries and live music', 'Ski slopes', 'Container ports', 'Coal plants'], 0),
    ],
  },
];

export function getLocation(id: string): Location | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

export function getHotspot(id: string): Hotspot | undefined {
  return HOTSPOTS.find((h) => h.id === id);
}

export function getHotspotsForLocation(locationId: string): Hotspot[] {
  return HOTSPOTS.filter((h) => h.locationId === locationId);
}
