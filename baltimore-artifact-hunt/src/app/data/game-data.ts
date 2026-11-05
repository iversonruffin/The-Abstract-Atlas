import { City, CityLocation, Hotspot } from '../models/game.models';

// ---------------------------------------------------------------------------
// Seed content, sourced from the "Abstract Cataract — Baltimore Artifact
// Hunt" game bible. Each location currently ships with ONE hotspot (the
// beacon that already existed in the original Inner Harbor prototype); add
// more hotspot objects to a location's array as real restaurant/bar/store
// partners come on board. Trivia questions below are PLACEHOLDER copy —
// swap in real history/art facts before this goes live.
// ---------------------------------------------------------------------------

export const CITY_LOCATIONS: CityLocation[] = [
  // Federal Hill is the first open location (guests can play it), so it is listed first on the map.
  {
    id: 'federal-hill',
    cityId: 'baltimore',
    name: 'Federal Hill',
    tagline: 'Rowhouses, a hilltop park, and harbor views',
    hotspotIds: ['federal-hill-beacon'],
  },
  {
    id: 'inner-harbor',
    cityId: 'baltimore',
    name: 'Inner Harbor',
    tagline: "Baltimore's historic waterfront heart",
    hotspotIds: ['inner-harbor-beacon'],
  },
  {
    id: 'pigtown',
    cityId: 'baltimore',
    name: 'Pigtown',
    tagline: "Baltimore's old railroad and stockyard district",
    hotspotIds: ['pigtown-beacon'],
  },
  // ---- Charlotte ----
  {
    id: 'uptown',
    cityId: 'charlotte',
    name: 'Uptown',
    tagline: "Charlotte's skyline, the Queen City's core",
    hotspotIds: ['uptown-beacon'],
  },
  {
    id: 'university',
    cityId: 'charlotte',
    name: 'University',
    tagline: 'Campus life and University City',
    hotspotIds: ['university-beacon'],
  },
  {
    id: 'noda',
    cityId: 'charlotte',
    name: 'NoDa',
    tagline: "Charlotte's arts district, in an old mill village",
    hotspotIds: ['noda-beacon'],
  },
];

/** Cities shown on the home page. Charlotte first, then Baltimore. */
export const CITIES: City[] = [
  {
    id: 'charlotte',
    name: 'Charlotte',
    tagline: 'The Queen City: Uptown, University, and NoDa',
    locationIds: ['uptown', 'university', 'noda'],
  },
  {
    id: 'baltimore',
    name: 'Baltimore',
    tagline: 'Charm City: Federal Hill, the Inner Harbor, and Pigtown',
    locationIds: ['federal-hill', 'inner-harbor', 'pigtown'],
  },
];

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'inner-harbor-beacon',
    locationId: 'inner-harbor',
    name: 'Inner Harbor',
    category: 'landmark',
    founded: '1729',
    knownFor: 'Piers & Pavilions',
    guideBlurb:
      "Baltimore's Inner Harbor is the historic waterfront heart of the city — once a working port, now a lively promenade of piers, museums, and pavilions ringing the water.",
    story: {
      title: 'Quiet Down Below',
      body:
        'PLACEHOLDER STORY COPY — replace with the official "Quiet Down Below" narrative from the game bible.',
      footer: '— a local Inner Harbor legend',
    },
    challengeType: 'trivia',
    triviaQuestions: [
      q('ih-1', 'In what year was the Inner Harbor area founded?', ['1629', '1729', '1829', '1929'], 1),
      q('ih-2', 'What once operated along the Inner Harbor before it became a promenade?', ['A working port', 'A railyard', 'A mining camp', 'A racetrack'], 0),
      q('ih-3', 'Which of these is found ringing the Inner Harbor today?', ['Museums and pavilions', 'Vineyards', 'Ski lifts', 'Coal plants'], 0),
      q('ih-4', 'The Inner Harbor is best described as:', ["A desert oasis", "Baltimore's historic waterfront", 'A mountain pass', 'An airport district'], 1),
      q('ih-5', 'Local legend says sailors watch the water at dusk for:', ['A whale breach', 'An answering blink of light', 'A meteor shower', 'A foghorn choir'], 1),
    ],
    badge: {
      id: 'harbor-hero',
      name: 'Harbor Hero',
      icon: '🏆',
      description: 'Awarded for completing the Inner Harbor challenge.',
    },
    unlockRequires: [],
    position: { xPct: 50, yPct: 78 },
    cityPosition: { xPct: 50, yPct: 78 },
  },
  {
    id: 'federal-hill-beacon',
    locationId: 'federal-hill',
    name: 'Federal Hill',
    category: 'landmark',
    knownFor: 'Hilltop Park & Harbor Views',
    guideBlurb:
      'Federal Hill Park sits atop a bluff overlooking the harbor, long used as a lookout point and now a favorite spot for skyline views.',
    story: {
      title: 'The Wonderful Park',
      body:
        'PLACEHOLDER STORY COPY — replace with the official "The Wonderful Park" narrative from the game bible.',
      footer: '— a local Federal Hill legend',
    },
    challengeType: 'trivia',
    triviaQuestions: [
      q('fh-1', 'Federal Hill Park is best known for offering:', ['Harbor skyline views', 'Ski slopes', 'Desert dunes', 'A working farm'], 0),
      q('fh-2', 'Federal Hill sits on top of a:', ['Bluff / hill', 'Bridge', 'Tunnel', 'Pier'], 0),
      q('fh-3', 'Historically, Federal Hill was used as a:', ['Lookout point', 'Landing strip', 'Coal mine', 'Racetrack'], 0),
      q('fh-4', 'The neighborhood around Federal Hill is known for its:', ['Rowhouses', 'Skyscrapers', 'Vineyards', 'Wind farms'], 0),
      q('fh-5', 'Federal Hill overlooks which body of water?', ['The harbor', 'The Chesapeake Bay bridge', 'A mountain lake', 'The Susquehanna'], 0),
    ],
    badge: {
      id: 'hilltop-adventurer',
      name: 'Hilltop Adventurer',
      icon: '⛰️',
      description: 'Awarded for completing the Federal Hill challenge.',
    },
    unlockRequires: [],
    position: { xPct: 50, yPct: 78 },
    cityPosition: { xPct: 20, yPct: 78 },
  },
  {
    id: 'pigtown-beacon',
    locationId: 'pigtown',
    name: 'Pigtown',
    category: 'landmark',
    knownFor: 'Railroad & Stockyard History',
    guideBlurb:
      "Pigtown takes its name from the 19th-century stockyards near the B&O Railroad, where livestock were driven through the streets to slaughterhouses.",
    story: {
      title: 'Not Your Farm',
      body:
        'PLACEHOLDER STORY COPY — replace with the official "Not Your Farm" narrative from the game bible.',
      footer: '— a local Pigtown legend',
    },
    challengeType: 'trivia',
    triviaQuestions: [
      q('pt-1', 'Pigtown got its name from nearby:', ['Stockyards', 'Vineyards', 'Shipyards', 'Coal yards'], 0),
      q('pt-2', 'Which railroad is historically tied to Pigtown?', ['B&O Railroad', 'Amtrak Acela', 'Union Pacific', 'Orient Express'], 0),
      q('pt-3', 'Livestock in old Pigtown were driven toward:', ['Slaughterhouses', 'The harbor docks', 'A racetrack', 'A church fair'], 0),
      q('pt-4', 'Pigtown is a neighborhood in which city?', ['Baltimore', 'Philadelphia', 'Richmond', 'Pittsburgh'], 0),
      q('pt-5', "Pigtown's history is most tied to which century?", ['19th century', '21st century', '17th century', '12th century'], 0),
    ],
    badge: {
      id: 'oink-patroller',
      name: 'Oink Patroller',
      icon: '🐖',
      description: 'Awarded for completing the Pigtown challenge.',
    },
    unlockRequires: [],
    position: { xPct: 50, yPct: 78 },
    cityPosition: { xPct: 80, yPct: 78 },
  },

  // ---------------------------------------------------------------------------
  // CHARLOTTE. Story text and character bios are PLACEHOLDERS until the real copy is written.
  // Trivia is a first draft of well-known facts: fact-check before launch.
  // `cityPosition` is where the house sits in the city scene (x = 20 / 50 / 80).
  // To add a person to a place: push { id, name, photo, story } into its `characters`.
  // ---------------------------------------------------------------------------
  {
    id: 'uptown-beacon',
    locationId: 'uptown',
    name: 'Uptown',
    category: 'landmark',
    knownFor: 'Skyline & the Trade/Tryon crossroads',
    guideBlurb:
      "Uptown is Charlotte's downtown core, where the city's tallest towers rise around the crossing of Trade and Tryon streets.",
    story: {
      title: 'The Queen at the Crossroads',
      body: 'PLACEHOLDER STORY COPY — replace with the official Uptown story.',
      footer: '— a local Uptown legend',
    },
    challengeType: 'trivia',
    triviaQuestions: [
      q('up-1', 'Charlotte is nicknamed the:', ['Queen City', 'Steel City', 'Motor City', 'Windy City'], 0),
      q('up-2', 'Charlotte was named for the wife of which British king?', ['George III', 'Henry VIII', 'Louis XIV', 'Charles II'], 0),
      q('up-3', "Charlotte's downtown core is commonly called:", ['Uptown', 'Midtown', 'Overtown', 'Crosstown'], 0),
      q('up-4', 'The two main streets that cross at the center of Uptown are Trade Street and:', ['Tryon Street', 'Elm Street', 'Maple Street', 'Peachtree Street'], 0),
      q('up-5', 'Charlotte is the county seat of which county?', ['Mecklenburg', 'Wake', 'Guilford', 'Durham'], 0),
    ],
    badge: {
      id: 'queen-city-climber',
      name: 'Queen City Climber',
      icon: '🏙️',
      description: 'Awarded for completing the Uptown challenge.',
    },
    characters: [
      {
        id: 'jesus-saves-guy',
        name: 'The "Jesus Saves!" Guy',
        // photo: 'images/characters/jesus-saves-guy.jpg', // <- uncomment once the picture is in public/images/characters/
        story: 'PLACEHOLDER — a short story about who he is goes here.',
      },
    ],
    unlockRequires: [],
    position: { xPct: 50, yPct: 78 },
    cityPosition: { xPct: 20, yPct: 78 },
  },
  {
    id: 'university-beacon',
    locationId: 'university',
    name: 'University',
    category: 'landmark',
    knownFor: 'Campus life & University City',
    guideBlurb:
      'The University area around UNC Charlotte, north of Uptown, is where students, researchers, and neighbors share a fast-growing corner of the city.',
    story: {
      title: 'The Gold Rush Scholars',
      body: 'PLACEHOLDER STORY COPY — replace with the official University story.',
      footer: '— a local University legend',
    },
    challengeType: 'trivia',
    triviaQuestions: [
      q('un-1', "UNC Charlotte's athletic teams are called the:", ['49ers', 'Tar Heels', 'Wolfpack', 'Blue Devils'], 0),
      q('un-2', "The '49ers' name nods to which part of the region's history?", ['The gold rush', 'The railroad boom', 'The tobacco trade', 'The shipbuilding era'], 0),
      q('un-3', 'UNC Charlotte began in 1946 as a college center for returning:', ['World War II veterans', 'Bank employees', 'Textile workers', 'Race car drivers'], 0),
      q('un-4', 'The area around the campus, north of Uptown, is often called:', ['University City', 'Old Town', 'Harbor District', 'The Heights'], 0),
      q('un-5', 'Which light rail line was extended to UNC Charlotte in 2018?', ['LYNX Blue Line', 'The Red Line', 'The Orange Line', 'The Gold Line'], 0),
    ],
    badge: {
      id: 'campus-scholar',
      name: 'Campus Scholar',
      icon: '🎓',
      description: 'Awarded for completing the University challenge.',
    },
    characters: [],
    unlockRequires: [],
    position: { xPct: 50, yPct: 78 },
    cityPosition: { xPct: 50, yPct: 78 },
  },
  {
    id: 'noda-beacon',
    locationId: 'noda',
    name: 'NoDa',
    category: 'landmark',
    knownFor: 'Galleries, music & mill-village history',
    guideBlurb: "NoDa, short for North Davidson, is Charlotte's arts district, built in and around an old textile mill village.",
    story: {
      title: 'Looms and Lights',
      body: 'PLACEHOLDER STORY COPY — replace with the official NoDa story.',
      footer: '— a local NoDa legend',
    },
    challengeType: 'trivia',
    triviaQuestions: [
      q('nd-1', 'NoDa is short for:', ['North Davidson', 'North Dallas', 'New Downtown', 'Northern Docks'], 0),
      q('nd-2', 'NoDa is best known as an:', ['Arts district', 'Airport district', 'Stockyard district', 'Financial district'], 0),
      q('nd-3', 'NoDa grew around a historic:', ['Textile mill village', 'Shipyard', 'Gold mine', 'Racetrack'], 0),
      q('nd-4', "Which crop's textile industry built the mill villages around Charlotte?", ['Cotton', 'Sugar cane', 'Rice', 'Wheat'], 0),
      q('nd-5', 'Today NoDa is popular for:', ['Galleries, breweries and live music', 'Ski slopes', 'Container ports', 'Coal plants'], 0),
    ],
    badge: {
      id: 'noda-artist',
      name: 'NoDa Artist',
      icon: '🎨',
      description: 'Awarded for completing the NoDa challenge.',
    },
    characters: [],
    unlockRequires: [],
    position: { xPct: 50, yPct: 78 },
    cityPosition: { xPct: 80, yPct: 78 },
  },
];

function q(id: string, prompt: string, choices: string[], correctIndex: number) {
  return { id, prompt, choices, correctIndex, timeLimitSeconds: 10 };
}
