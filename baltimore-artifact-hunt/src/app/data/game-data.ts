import { CityLocation, Hotspot } from '../models/game.models';

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
    name: 'Federal Hill',
    tagline: 'Rowhouses, a hilltop park, and harbor views',
    hotspotIds: ['federal-hill-beacon'],
  },
  {
    id: 'inner-harbor',
    name: 'Inner Harbor',
    tagline: "Baltimore's historic waterfront heart",
    hotspotIds: ['inner-harbor-beacon'],
  },
  {
    id: 'pigtown',
    name: 'Pigtown',
    tagline: "Baltimore's old railroad and stockyard district",
    hotspotIds: ['pigtown-beacon'],
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
  },
];

function q(id: string, prompt: string, choices: string[], correctIndex: number) {
  return { id, prompt, choices, correctIndex, timeLimitSeconds: 10 };
}
