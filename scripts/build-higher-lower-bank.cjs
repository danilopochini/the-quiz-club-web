const fs = require('node:fs');
const path = require('node:path');
const images = require('../data/higher-lower-images.json');

// Each list uses a single measurement definition and source; pairings are generated without reversals.
const groups = [
  {
    category: 'geography', metric: 'Total country area, including inland water', unit: 'km²',
    question: 'Does the second country have a larger or smaller total area?',
    sourceName: 'Encyclopaedia Britannica, country areas', source: 'https://www.britannica.com/topic/list-of-the-total-areas-of-the-worlds-countries-dependencies-and-territories-2130540', referenceYear: 'Britannica figures',
    items: [
      ['Russia', 17075400, 'Russia spans both Europe and Asia.'],
      ['Canada', 9968242, 'Canada stretches from the Atlantic to the Pacific and Arctic oceans.'],
      ['United States', 9866632, 'The United States includes Alaska, separated from the contiguous states by Canada.'],
      ['China', 9572900, 'China extends from the Pacific coast deep into Central Asia.'],
      ['Brazil', 8510418, 'Brazil is the largest country in South America.'],
      ['Australia', 7688126, 'Australia occupies an entire continent and its surrounding islands.']
    ]
  },
  {
    category: 'movies-television', metric: 'Competitive Academy Awards won by the film', unit: 'Oscars',
    question: 'Did the second film win more or fewer competitive Oscars?',
    sourceName: 'Academy of Motion Picture Arts and Sciences, film statistics', source: 'https://awardsdatabase.oscars.org/Help/Statistics?file=Gen-Films5awards.pdf', referenceYear: 'through the 88th awards, 2016',
    items: [
      ['Titanic (1997)', 11, 'Titanic shares the 11-win milestone with two other films.'],
      ['West Side Story (1961)', 10, 'West Side Story won the best picture Oscar.'],
      ['Gigi (1958)', 9, 'Gigi won every competitive Oscar for which it was nominated.'],
      ['Amadeus (1984)', 8, 'Amadeus is a historical drama about Mozart and Salieri.'],
      ["Schindler's List (1993)", 7, "Schindler's List won best picture."],
      ['All About Eve (1950)', 6, 'All About Eve received 14 nominations.']
    ]
  },
  {
    category: 'music', metric: 'Eurovision Song Contest winning year', unit: 'year',
    question: 'Did the second performer win Eurovision in a later or earlier year?',
    sourceName: 'Encyclopaedia Britannica, Eurovision winners', source: 'https://www.britannica.com/art/Eurovision-Song-Contest-winner-2226035', referenceYear: 'contest year',
    items: [
      ['Lys Assia — Refrain', 1956, 'Lys Assia won the inaugural Eurovision Song Contest for Switzerland.'],
      ['ABBA — Waterloo', 1974, 'ABBA won for Sweden with Waterloo.'],
      ['Brotherhood of Man — Save Your Kisses for Me', 1976, 'Brotherhood of Man represented the United Kingdom.'],
      ["Johnny Logan — What's Another Year", 1980, 'Johnny Logan represented Ireland.'],
      ['Céline Dion — Ne partez pas sans moi', 1988, 'Céline Dion represented Switzerland.'],
      ['Måneskin — Zitti e buoni', 2021, 'Måneskin represented Italy.']
    ]
  },
  {
    category: 'history', metric: 'Year first US presidential term began', unit: 'year',
    question: 'Did the second president begin their first term in a later or earlier year?',
    sourceName: 'Encyclopaedia Britannica, US presidents', source: 'https://www.britannica.com/place/United-States/Presidents-of-the-United-States', referenceYear: 'term start year',
    items: [
      ['George Washington', 1789, 'Washington was the first president of the United States.'],
      ['John Adams', 1797, 'Adams was the second president of the United States.'],
      ['Thomas Jefferson', 1801, 'Jefferson was the third president of the United States.'],
      ['James Madison', 1809, 'Madison was the fourth president of the United States.'],
      ['James Monroe', 1817, 'Monroe was the fifth president of the United States.'],
      ['John Quincy Adams', 1825, 'John Quincy Adams was the sixth president and the son of John Adams.']
    ]
  },
  {
    category: 'sports', metric: 'Official Summer Olympic Games edition year', unit: 'year',
    question: 'Is the second Summer Olympics edition numbered with a later or earlier year?',
    sourceName: 'Olympics.com, Olympic results', source: 'https://www.olympics.com/en/olympic-games/olympic-results', referenceYear: 'official edition year',
    items: [
      ['Sydney Summer Olympics', 2000, 'Sydney hosted the Summer Games in Australia.'],
      ['Athens Summer Olympics', 2004, 'Athens hosted the Games in Greece.'],
      ['Beijing Summer Olympics', 2008, 'Beijing hosted its first Summer Games in 2008.'],
      ['London Summer Olympics', 2012, 'London hosted the Summer Games for the third time in 2012.'],
      ['Rio Summer Olympics', 2016, 'Rio de Janeiro hosted the first Summer Games held in South America.'],
      ['Tokyo Summer Olympics', 2020, 'The Tokyo 2020 Games took place in 2021 but retained their official 2020 name.']
    ]
  },
  {
    category: 'science-nature', metric: 'Planet equatorial diameter', unit: 'km',
    question: 'Does the second planet have a larger or smaller equatorial diameter?',
    sourceName: 'NASA planetary fact sheet', source: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/index.html', referenceYear: 'NASA fact sheet, 2025',
    items: [
      ['Mercury', 4879, 'Mercury is the planet closest to the Sun.'],
      ['Mars', 6792, 'Mars is known as the red planet.'],
      ['Venus', 12104, 'Venus is closer to the Sun than Earth.'],
      ['Earth', 12756, 'Earth is the third planet from the Sun.'],
      ['Neptune', 49528, 'Neptune is the outermost planet in the solar system.'],
      ['Jupiter', 142984, 'Jupiter is the largest planet in the solar system.']
    ]
  },
  {
    category: 'art-literature', metric: 'Nobel Prize in Literature year', unit: 'year',
    question: 'Did the second writer receive the Nobel Prize in Literature in a later or earlier year?',
    sourceName: 'Nobel Prize, literature laureates', source: 'https://www.nobelprize.org/prizes/lists/all-nobel-prizes-in-literature/all/', referenceYear: 'award year',
    items: [
      ['Rudyard Kipling', 1907, 'Kipling wrote The Jungle Book.'],
      ['Ernest Hemingway', 1954, 'Hemingway wrote The Old Man and the Sea.'],
      ['John Steinbeck', 1962, 'Steinbeck wrote The Grapes of Wrath.'],
      ['Gabriel García Márquez', 1982, 'García Márquez wrote One Hundred Years of Solitude.'],
      ['Toni Morrison', 1993, 'Morrison wrote Beloved.'],
      ['Bob Dylan', 2016, 'Dylan is known for his songwriting as well as his Nobel Prize.']
    ]
  },
  {
    category: 'lifestyle-brands', metric: 'Nintendo hardware launch year in Europe', unit: 'year',
    question: 'Did the second Nintendo system launch in Europe in a later or earlier year?',
    sourceName: 'Nintendo, company history', source: 'https://www.nintendo.com/en-gb/Hardware/Nintendo-History/Nintendo-History-625945.html', referenceYear: 'European launch year',
    items: [
      ['Nintendo Entertainment System', 1986, 'The NES brought Nintendo home games to Europe.'],
      ['Game Boy', 1990, 'The Game Boy brought interchangeable game cartridges to a handheld system.'],
      ['Super Nintendo Entertainment System', 1992, 'The Super Nintendo was Nintendo’s 16-bit successor to the NES.'],
      ['Nintendo 64', 1997, 'The Nintendo 64 launched in Europe in March.'],
      ['GameCube', 2002, 'The GameCube launched in Europe with 20 titles.'],
      ['Nintendo DS', 2005, 'The Nintendo DS introduced a dual-screen handheld with a touch screen.']
    ]
  },
  {
    category: 'people-places', metric: 'Architectural height of completed skyscraper', unit: 'm',
    question: 'Is the second skyscraper taller or shorter by architectural height?',
    sourceName: 'Encyclopaedia Britannica, tallest buildings', source: 'https://www.britannica.com/topic/tallest-buildings-in-the-world-2226971', referenceYear: 'completed-building heights',
    items: [
      ['Burj Khalifa — Dubai', 828, 'Burj Khalifa opened in Dubai in 2010.'],
      ['Merdeka 118 — Kuala Lumpur', 679, 'Merdeka 118 was completed in Kuala Lumpur in 2023.'],
      ['Shanghai Tower — Shanghai', 632, 'Shanghai Tower was completed in 2015.'],
      ['Makkah Royal Clock Tower — Mecca', 601, 'The Makkah Royal Clock Tower was completed in 2012.'],
      ['Lotte World Tower — Seoul', 555, 'Lotte World Tower was completed in 2017.'],
      ['Taipei 101 — Taipei', 508, 'Taipei 101 was completed in 2004.']
    ]
  },
  {
    category: 'mathematics-logic', metric: 'Number of sides of the polygon', unit: 'sides',
    question: 'Does the second polygon have more or fewer sides?',
    sourceName: 'CK-12 Foundation, polygon classification', source: 'https://flexbooks.ck12.org/cbook/ck-12-basic-geometry-concepts/section/1.12/related/lesson/polygon-classification-msm7/', referenceYear: 'geometric definitions',
    items: [
      ['Triangle', 3, 'A triangle is the polygon with the fewest sides.'],
      ['Quadrilateral', 4, 'Squares and rectangles are quadrilaterals.'],
      ['Pentagon', 5, 'The Pentagon building takes its name from its five-sided shape.'],
      ['Hexagon', 6, 'A honeycomb cell has a hexagonal outline.'],
      ['Heptagon', 7, 'A heptagon is also called a septagon.'],
      ['Octagon', 8, 'A standard stop sign has an octagonal outline.']
    ]
  },
  {
    category: 'pop-culture', metric: 'Nintendo game release year in Europe', unit: 'year',
    question: 'Did the second game arrive in Europe in a later or earlier year?',
    sourceName: 'Nintendo, company history', source: 'https://www.nintendo.com/en-gb/Hardware/Nintendo-History/Nintendo-History-625945.html', referenceYear: 'European release year',
    items: [
      ['Pokémon Gold and Silver', 2001, 'Pokémon Gold and Silver launched simultaneously in Europe.'],
      ['Super Mario Sunshine', 2002, 'Super Mario Sunshine was released for the GameCube.'],
      ['The Legend of Zelda: The Wind Waker', 2003, 'The Wind Waker featured a distinctive cel-shaded style.'],
      ['Pokémon FireRed and LeafGreen', 2004, 'FireRed and LeafGreen were released for Game Boy Advance.'],
      ['Animal Crossing: Wild World', 2006, 'Wild World brought Animal Crossing to the Nintendo DS.'],
      ['Super Mario Galaxy', 2007, 'Super Mario Galaxy brought the Mario series to Wii.']
    ]
  },
  {
    category: 'general-knowledge', metric: 'Atomic number', unit: 'protons',
    question: 'Does an atom of the second element have a higher or lower atomic number?',
    sourceName: 'Encyclopaedia Britannica, chemical elements', source: 'https://www.britannica.com/topic/list-of-chemical-elements-2026117', referenceYear: 'periodic table',
    items: [
      ['Hydrogen', 1, 'Hydrogen is the first element in the periodic table.'],
      ['Carbon', 6, 'Carbon is a fundamental component of organic compounds.'],
      ['Oxygen', 8, 'Oxygen is a major component of Earth’s atmosphere.'],
      ['Sodium', 11, 'Sodium combines with chlorine to form common table salt.'],
      ['Iron', 26, 'Iron is used to make steel.'],
      ['Gold', 79, 'Gold has the chemical symbol Au.']
    ]
  }
];

const bank = [];
for (const group of groups) {
  let number = 0;
  for (let i = 0; i < group.items.length; i++) {
    for (let j = i + 1; j < group.items.length; j++) {
      const [leftName, leftValue, leftFact] = group.items[i];
      const [rightName, rightValue, rightFact] = group.items[j];
      number++;
      bank.push({
        id: `${group.category}-${String(number).padStart(3, '0')}`,
        category: group.category, metric: group.metric, question: group.question, unit: group.unit,
        left: { name: leftName, value: leftValue, image: images[group.category][i] },
        right: { name: rightName, value: rightValue, image: images[group.category][j] },
        explanation: `${leftFact} ${rightFact}`, sourceName: group.sourceName, source: group.source,
        referenceYear: group.referenceYear
      });
    }
  }
}
fs.writeFileSync(path.join(__dirname, '..', 'data', 'higher-lower.json'), `${JSON.stringify(bank, null, 2)}\n`);
