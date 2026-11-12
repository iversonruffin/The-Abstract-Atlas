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
  /** Optional picture shown above the question. Path under public/, e.g. 'images/trivia/ctc-station.jpg'. */
  image?: string;
  /** Optional line shown after any wrong answer, e.g. "Ok, well that's DEFINITELY not right." */
  wrongResponse?: string;
  /** Optional line shown after the right answer. */
  correctResponse?: string;
  /** Optional line per choice (same order as choices; null = use the lines above). Wins over the others. */
  choiceResponses?: (string | null)[];
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
  /** Shown as "Coming soon": nobody (guest or account) can play it yet, and sign-up doesn't unlock it. */
  comingSoon?: boolean;
}

// WHO CAN PLAY WHAT (MVP, 4 locations):
//   Charm City:  Ridgely's = guests,  Inner Harbor = unlocks at sign-up
//   Queen City:  Uptown = guests,     University = unlocks at sign-up
//   Federal Hill and NoDa are commented out below (off the map for now).
export const LOCATIONS: Location[] = [
  // ---- Charm City (Baltimore) ----
  {
    id: 'ridgelys',
    name: "Ridgely's",
    tagline: 'Rowhouses in the shadow of Camden Yards',
    hotspotIds: ['ridgelys-beacon'],
    guestAccessible: true,
  },
  {
    id: 'inner-harbor',
    name: 'Inner Harbor',
    tagline: "Baltimore's historic waterfront heart",
    hotspotIds: ['inner-harbor-beacon'],
    guestAccessible: false,
  },
  // Federal Hill is off the map for now (11/11). Uncomment to bring it back.
  // {
  //   id: 'federal-hill',
  //   name: 'Federal Hill',
  //   tagline: 'Rowhouses, a hilltop park, and harbor views',
  //   hotspotIds: ['federal-hill-beacon'],
  //   guestAccessible: false,
  //   comingSoon: true,
  // },
  // Pigtown was replaced by Ridgely's. Kept here for reference.
  // {
  //   id: 'pigtown',
  //   name: 'Pigtown',
  //   tagline: "Baltimore's old railroad and stockyard district",
  //   hotspotIds: ['pigtown-beacon'],
  //   guestAccessible: false,
  // },
  // ---- Queen City (Charlotte) ----
  {
    id: 'uptown',
    name: 'Uptown',
    tagline: "Charlotte's skyline, the Queen City's core",
    hotspotIds: ['uptown-beacon'],
    guestAccessible: true,
  },
  {
    id: 'university',
    name: 'University',
    tagline: 'Campus life and University City',
    hotspotIds: ['university-beacon'],
    guestAccessible: false,
  },
  // NoDa is off the map for now (11/11). Uncomment to bring it back.
  // {
  //   id: 'noda',
  //   name: 'NoDa',
  //   tagline: "Charlotte's arts district, in an old mill village",
  //   hotspotIds: ['noda-beacon'],
  //   guestAccessible: false,
  //   comingSoon: true,
  // },
];

// Optional 5th argument: { image, wrongResponse, correctResponse, choiceResponses } (same as the frontend).
function q(id: string, prompt: string, choices: string[], correctIndex: number, extra: { image?: string; wrongResponse?: string; correctResponse?: string; choiceResponses?: (string | null)[] } = {}): Question {
  return { id, prompt, choices, correctIndex, timeLimitSeconds: 15, ...extra }; // was 10
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
      q("ih-1", "The ship docked at the Inner Harbor was the last all-sail warship the U.S. Navy built. What's its name?", ["USS Constellation", "USS Constitution", "USS Maryland", "Pride of Baltimore"], 0, { image: "images/trivia/ih-1.svg" }),
      q("ih-2", "What's the name of the googly-eyed machine that eats trash where the Jones Falls meets the harbor?", ["Mr. Trash Wheel", "Captain Trash Can", "The Harbor Muncher", "Sir Scoops-a-Lot"], 0, { image: "images/trivia/ih-2.svg" }),
      q("ih-3", "Besides the river's current, what powers Mr. Trash Wheel?", ["Solar panels", "A wind turbine", "A diesel engine", "A giant hamster"], 0, { image: "images/trivia/ih-3.svg" }),
      q("ih-4", "The World Trade Center on the harbor is the world's tallest building with how many equal sides?", ["5", "4", "6", "8"], 0, { image: "images/trivia/ih-4.svg" }),
      q("ih-5", "Which giant red neon sign glows across the water at night?", ["Domino Sugars", "Natty Boh", "Old Bay", "Utz"], 0, { image: "images/trivia/ih-5.svg" }),
      q("ih-6", "Which Inner Harbor building has a tropical rainforest on its roof?", ["The National Aquarium", "The Maryland Science Center", "Harborplace", "The Power Plant"], 0, { image: "images/trivia/ih-6.svg" }),
      q("ih-7", "The Harborplace pavilions first opened in what year?", ["1980", "1966", "1992", "2001"], 0, { image: "images/trivia/ih-7.svg" }),
      q("ih-8", "The famous paddle boats on the harbor are shaped like what?", ["Dragons", "Ducks", "Swans", "Crabs"], 0, { image: "images/trivia/ih-8.svg" }),
      q("ih-9", "In 1904, what disaster wiped out much of downtown near the old waterfront?", ["The Great Baltimore Fire", "A hurricane", "A flood", "An earthquake"], 0, { image: "images/trivia/ih-9.svg" }),
      q("ih-10", "Baltimoreans put Old Bay on almost everything. What was it made for?", ["Steamed crabs", "Pizza", "French fries", "Popcorn"], 0, { image: "images/trivia/ih-10.svg", wrongResponse: "On THAT? Okay, maybe. But that's not what it was made for." }),
      // Before 11/12 (kept for reference):
      // q('ih-1', 'In what year was the Inner Harbor area founded?', ['1629', '1729', '1829', '1929'], 1),
      // q('ih-2', 'What once operated along the Inner Harbor before it became a promenade?', ['A working port', 'A railyard', 'A mining camp', 'A racetrack'], 0),
      // q('ih-3', 'Which of these is found ringing the Inner Harbor today?', ['Museums and pavilions', 'Vineyards', 'Ski lifts', 'Coal plants'], 0),
      // q('ih-4', 'The Inner Harbor is best described as:', ['A desert oasis', "Baltimore's historic waterfront", 'A mountain pass', 'An airport district'], 1),
      // q('ih-5', 'Local legend says sailors watch the water at dusk for:', ['A whale breach', 'An answering blink of light', 'A meteor shower', 'A foghorn choir'], 1),
    ],
  },
  {
    id: 'ridgelys-beacon',
    locationId: 'ridgelys',
    name: "Ridgely's",
    badge: {
      id: 'delight-seeker',
      name: 'Delight Seeker',
      icon: '⚾',
      description: "Awarded for completing the Ridgely's challenge.",
    },
    questions: [
      q("rd-1", "Which baseball legend was born on Emory Street in Ridgely's Delight?", ["Babe Ruth", "Cal Ripken Jr.", "Jackie Robinson", "Lou Gehrig"], 0, { image: "images/trivia/rd-1.svg" }),
      q("rd-2", "Babe Ruth's father ran a saloon on Conway Street. What part of Camden Yards sits there now?", ["Left-center field", "Home plate", "The visitors' dugout", "The Eutaw Street warehouse"], 0, { image: "images/trivia/rd-2.svg" }),
      q("rd-3", "Two stadiums sit a short walk from Ridgely's. Which teams play in them?", ["The Orioles and the Ravens", "The Orioles and the Colts", "The Nationals and the Ravens", "The Orioles and the Blast"], 0, { image: "images/trivia/rd-3.svg" }),
      q("rd-4", "How does a born-and-raised Baltimorean say 'Maryland'?", ["Merlin", "Mary-land", "Mare-uh-land", "Murr-land"], 0, { image: "images/trivia/rd-4.svg", wrongResponse: "Hon, nobody from Baltimore says it like that." }),
      q("rd-5", "When a home run lands on Eutaw Street, what marks the spot?", ["A bronze plaque in the ground", "An orange painted O", "A brick with the batter's name", "Nothing. They keep the ball"], 0, { image: "images/trivia/rd-5.svg" }),
      q("rd-6", "Who is the only player to hit the B&O Warehouse on the fly?", ["Ken Griffey Jr.", "Cal Ripken Jr.", "Mark McGwire", "Chris Davis"], 0, { image: "images/trivia/rd-6.svg" }),
      q("rd-7", "During the national anthem at an Orioles game, what do fans shout at \"Oh, say does that star-spangled...\"?", ["\"O!\"", "\"Birds!\"", "\"Hon!\"", "\"Play ball!\""], 0, { image: "images/trivia/rd-7.svg" }),
      q("rd-8", "Which former Oriole has a barbecue stand on Eutaw Street?", ["Boog Powell", "Brooks Robinson", "Jim Palmer", "Eddie Murray"], 0, { image: "images/trivia/rd-8.svg" }),
      q("rd-9", "In 1792, part of the Ridgely's Delight land was renamed Fayetteville to honor which French hero?", ["The Marquis de Lafayette", "Napoleon", "Rochambeau", "Joan of Arc"], 0, { image: "images/trivia/rd-9.svg" }),
      q("rd-10", "Which train station sits right by Ridgely's, behind the warehouse?", ["Camden Station", "Penn Station", "President Street Station", "Union Station"], 0, { image: "images/trivia/rd-10.svg" }),
      // Before 11/12 (kept for reference):
      // q('rd-1', "Which baseball legend was born on Emory Street in Ridgely's Delight?", ['Babe Ruth', 'Cal Ripken Jr.', 'Jackie Robinson', 'Lou Gehrig'], 0),
      // q('rd-2', "Babe Ruth's father ran a saloon on Conway Street. What part of Camden Yards sits there now?", ['Left-center field', 'Home plate', "The visitors' dugout", 'The Eutaw Street warehouse'], 0),
      // q('rd-3', "Two stadiums sit a short walk from Ridgely's. Which teams play in them?", ['The Orioles and the Ravens', 'The Orioles and the Colts', 'The Nationals and the Ravens', 'The Orioles and the Blast'], 0),
      // q('rd-4', "How does a born-and-raised Baltimorean say 'Maryland'?", ['Merlin', 'Mary-land', 'Mare-uh-land', 'Murr-land'], 0),
    ],
  },
  // Pigtown was replaced by Ridgely's. Its hotspot is kept but no location points to it.
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
      q("up-1", "How many stops are on Charlotte's light rail, the LYNX Blue Line?", ["26", "18", "32", "41"], 0, { image: "images/trivia/up-1.svg" }),
      q("up-2", "Which light rail stop drops you off in the heart of Uptown?", ["CTC/Arena", "Scaleybark", "Tom Hunter", "Old Pineville"], 0, { image: "images/trivia/up-2.svg" }),
      q("up-3", "Which Uptown bar has a downstairs dance room?", ["Retro", "The Rooftop", "Cellar Door", "The Library"], 0, { image: "images/trivia/up-3.svg" }),
      q("up-4", "How many wards is Uptown split into?", ["4", "2", "6", "8"], 0, { image: "images/trivia/up-4.svg" }),
      q("up-5", "What do you call someone from Charlotte?", ["A Charlottean", "A Charlottite", "A Queen Citizen", "A Charlotter"], 0, { image: "images/trivia/up-5.svg", wrongResponse: "Close, but a real local would know that one." }),
      q("up-6", "Which British general called Charlotte \"a hornet's nest of rebellion\"?", ["Lord Cornwallis", "William Howe", "John Burgoyne", "Henry Clinton"], 0, { image: "images/trivia/up-6.svg" }),
      q("up-7", "Locals call the corner of Trade and Tryon:", ["The Square", "The Crossroads", "The Plaza", "The Corner"], 0, { image: "images/trivia/up-7.svg" }),
      q("up-8", "Charlotte is named after the wife of which British king?", ["George III", "Henry VIII", "Charles II", "William III"], 0, { image: "images/trivia/up-8.svg" }),
      q("up-9", "Bronze statues of what animal guard the gates of the football stadium in Uptown?", ["Panthers", "Hornets", "Eagles", "Lions"], 0, { image: "images/trivia/up-9.svg" }),
      q("up-10", "What sits on top of the tallest building in North Carolina, in Uptown?", ["A crown", "A dome", "A flagpole", "A glass pyramid"], 0, { image: "images/trivia/up-10.svg" }),
      // Before 11/12 (kept for reference):
      // q('up-1', 'Charlotte is nicknamed the:', ['Queen City', 'Steel City', 'Motor City', 'Windy City'], 0),
      // q('up-2', "Charlotte was named for the wife of which British king?", ['George III', 'Henry VIII', 'Louis XIV', 'Charles II'], 0),
      // q('up-3', "Charlotte's downtown core is commonly called:", ['Uptown', 'Midtown', 'Overtown', 'Crosstown'], 0),
      // q('up-4', "The two main streets that cross at the center of Uptown are Trade Street and:", ['Tryon Street', 'Elm Street', 'Maple Street', 'Peachtree Street'], 0),
      // q('up-5', 'Charlotte is the county seat of which county?', ['Mecklenburg', 'Wake', 'Guilford', 'Durham'], 0),
      // q('up-6', 'Which British general called Charlotte "a hornet\'s nest of rebellion"?', ['Lord Cornwallis', 'William Howe', 'John Burgoyne', 'Henry Clinton'], 0),
      // q('up-7', 'Locals call the corner of Trade and Tryon:', ['The Square', 'The Crossroads', 'The Plaza', 'The Corner'], 0),
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
      q("un-1", "If you lived in Belk Hall, which building would be a nightmare to walk to?", ["Duke Centennial Hall", "Atkins Library", "The Student Union", "Prospector"], 0, { image: "images/trivia/un-1.svg", wrongResponse: "Clearly you've never made that walk." }),
      q("un-2", "What animal statue stands outside Woodward Hall?", ["An eagle", "A lion", "A horse", "A bear"], 0, { image: "images/trivia/un-2.svg" }),
      q("un-3", "Which energy drink's trucks are always rolling around campus?", ["Red Bull", "Monster", "Celsius", "Bang"], 0, { image: "images/trivia/un-3.svg" }),
      q("un-4", "Which building did a deer once smash its way out of?", ["Woodward Hall", "Atkins Library", "Belk Hall", "The Student Union"], 0, { image: "images/trivia/un-4.svg" }),
      q("un-5", "UNC Charlotte's athletic teams are called the:", ["49ers", "Tar Heels", "Wolfpack", "Blue Devils"], 0, { image: "images/trivia/un-5.svg" }),
      q("un-6", "The '49ers' name nods to which part of the region's history?", ["The gold rush", "The railroad boom", "The tobacco trade", "The shipbuilding era"], 0, { image: "images/trivia/un-6.svg" }),
      q("un-7", "UNC Charlotte began in 1946 as a college center for returning:", ["World War II veterans", "Bank employees", "Textile workers", "Race car drivers"], 0, { image: "images/trivia/un-7.svg" }),
      q("un-8", "Which light rail line was extended to UNC Charlotte in 2018?", ["The LYNX Blue Line", "The Red Line", "The Orange Line", "The Gold Line"], 0, { image: "images/trivia/un-8.svg" }),
      q("un-9", "The area around the campus, north of Uptown, is often called:", ["University City", "Old Town", "Harbor District", "The Heights"], 0, { image: "images/trivia/un-9.svg" }),
      q("un-10", "What's the name of UNC Charlotte's mascot?", ["Norm the Niner", "Rocky the Ram", "Sammy the Miner", "Goldie the Prospector"], 0, { image: "images/trivia/un-10.svg" }),
      // Before 11/12 (kept for reference):
      // q('un-1', "UNC Charlotte's athletic teams are called the:", ['49ers', 'Tar Heels', 'Wolfpack', 'Blue Devils'], 0),
      // q('un-2', "The '49ers' name nods to which part of the region's history?", ['The gold rush', 'The railroad boom', 'The tobacco trade', 'The shipbuilding era'], 0),
      // q('un-3', 'UNC Charlotte began in 1946 as a college center for returning:', ['World War II veterans', 'Bank employees', 'Textile workers', 'Race car drivers'], 0),
      // q('un-4', 'The area around the campus, north of Uptown, is often called:', ['University City', 'Old Town', 'Harbor District', 'The Heights'], 0),
      // q('un-5', 'Which light rail line was extended to UNC Charlotte in 2018?', ['LYNX Blue Line', 'The Red Line', 'The Orange Line', 'The Gold Line'], 0),
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
