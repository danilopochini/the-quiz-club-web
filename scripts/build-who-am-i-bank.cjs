const fs = require('node:fs');
const path = require('node:path');

// Each row contains an identity, aliases, a source article, and five original clues.
const groups = {
  'historical-figures': [
    ['Cleopatra', ['Cleopatra VII'], 'Cleopatra', ['My family belonged to a dynasty descended from one of Alexander the Great’s generals.', 'I shared power with members of my own family.', 'I formed political alliances with Julius Caesar and Mark Antony.', 'My kingdom was centered on the Nile.', 'I was the last active ruler of Ptolemaic Egypt.']],
    ['Julius Caesar', ['Caesar'], 'Julius_Caesar', ['I wrote an account of campaigns in Gaul.', 'I crossed the Rubicon with my army.', 'I was named dictator for life in Rome.', 'I was assassinated on the Ides of March.', 'My adopted heir became Augustus.']],
    ['Napoleon Bonaparte', ['Napoleon'], 'Napoleon', ['I was born on Corsica.', 'I spent my final years in exile on Saint Helena.', 'I rose through the French military during the Revolution.', 'I crowned myself emperor of the French.', 'My final defeat came at Waterloo.']],
    ['Joan of Arc', ['Jeanne d Arc', 'Joan'], 'Joan_of_Arc', ['I was tried at Rouen in the 15th century.', 'I said that saints had given me a mission.', 'I supported Charles VII during the Hundred Years’ War.', 'I helped lift the siege of Orléans.', 'I am known as the Maid of Orléans.']],
    ['Mahatma Gandhi', ['Gandhi', 'Mohandas Gandhi', 'Mohandas Karamchand Gandhi'], 'Mahatma_Gandhi', ['I trained as a lawyer in London.', 'I worked against discriminatory laws in South Africa.', 'I led a protest march against a salt tax.', 'I promoted nonviolent resistance to British rule.', 'I became a leading figure in India’s independence movement.']],
    ['Nelson Mandela', ['Mandela'], 'Nelson_Mandela', ['I was born in the Eastern Cape.', 'I spent years imprisoned on Robben Island.', 'I shared the 1993 Nobel Peace Prize with F. W. de Klerk.', 'I opposed apartheid in South Africa.', 'I became South Africa’s first Black president.']],
    ['Abraham Lincoln', ['Lincoln'], 'Abraham_Lincoln', ['I practiced law in Illinois before becoming president.', 'I delivered a short speech at a Pennsylvania battlefield in 1863.', 'I issued the Emancipation Proclamation.', 'I led the United States during its Civil War.', 'I was assassinated at Ford’s Theatre.']],
    ['Queen Victoria', ['Victoria'], 'Queen_Victoria', ['My husband was Prince Albert of Saxe-Coburg and Gotha.', 'I came to the British throne in 1837.', 'My reign gave its name to an era of industrial change.', 'I was queen of the United Kingdom for more than six decades.', 'I was succeeded by my son Edward VII.']],
    ['Martin Luther King Jr.', ['Martin Luther King', 'MLK'], 'Martin_Luther_King_Jr.', ['I was a Baptist minister born in Atlanta.', 'I helped lead the Montgomery bus boycott.', 'I received the Nobel Peace Prize in 1964.', 'I spoke at the 1963 March on Washington.', 'My best-known speech includes the words “I have a dream.”']],
    ['Alexander the Great', ['Alexander III of Macedon', 'Alexander'], 'Alexander_the_Great', ['I was tutored by Aristotle.', 'I became king of Macedon after my father Philip II.', 'My forces defeated the Persian king Darius III.', 'My conquests reached as far as the Indian subcontinent.', 'Many cities, including one in Egypt, were named Alexandria for me.']]
  ],
  'scientists-inventors': [
    ['Albert Einstein', ['Einstein'], 'Albert_Einstein', ['I worked at a patent office in Bern.', 'My 1905 papers included work on the photoelectric effect.', 'I received the 1921 Nobel Prize in Physics.', 'I developed special and general relativity.', 'My famous equation relates energy and mass as E = mc².']],
    ['Marie Curie', ['Curie', 'Marie Sklodowska Curie'], 'Marie_Curie', ['I was born in Warsaw and studied in Paris.', 'I pioneered research into radioactivity.', 'I helped discover polonium and radium.', 'I worked with my husband Pierre on radioactive materials.', 'I received Nobel Prizes in both physics and chemistry.']],
    ['Isaac Newton', ['Newton', 'Sir Isaac Newton'], 'Isaac_Newton', ['I served as master of the Royal Mint.', 'I investigated how a prism separates white light.', 'I published the Principia in 1687.', 'I described laws of motion and universal gravitation.', 'A falling apple is famously associated with my thinking about gravity.']],
    ['Charles Darwin', ['Darwin'], 'Charles_Darwin', ['I traveled aboard HMS Beagle.', 'My observations included wildlife in the Galápagos Islands.', 'I proposed a mechanism involving natural selection.', 'I published On the Origin of Species in 1859.', 'My work transformed the study of biological evolution.']],
    ['Ada Lovelace', ['Lovelace', 'Ada Byron'], 'Ada_Lovelace', ['My father was the poet Lord Byron.', 'I worked with Charles Babbage on a proposed calculating machine.', 'My notes described a method for calculating Bernoulli numbers.', 'My work concerned the Analytical Engine.', 'I am often described as an early computer programmer.']],
    ['Galileo Galilei', ['Galileo'], 'Galileo_Galilei', ['I taught mathematics at Padua.', 'My observations included the phases of Venus.', 'I found four large moons orbiting Jupiter.', 'I supported the Sun-centered model of the solar system.', 'I used a telescope to study the heavens.']],
    ['Nikola Tesla', ['Tesla'], 'Nikola_Tesla', ['I was born in what is now Croatia.', 'I worked briefly for Thomas Edison.', 'I developed an induction motor using alternating current.', 'A unit of magnetic flux density bears my surname.', 'I am closely associated with AC electrical power systems.']],
    ['Alexander Fleming', ['Fleming', 'Sir Alexander Fleming'], 'Alexander_Fleming', ['I was a Scottish bacteriologist.', 'I observed an antibacterial substance in tears and named it lysozyme.', 'A contaminated laboratory culture helped lead to my best-known discovery.', 'I shared the 1945 Nobel Prize in Physiology or Medicine.', 'I discovered penicillin.']],
    ['Rosalind Franklin', ['Franklin', 'Rosalind Elsie Franklin'], 'Rosalind_Franklin', ['I researched the structure of coal before working on biological molecules.', 'I used X-ray diffraction in my research.', 'A famous image made by Raymond Gosling under my supervision was called Photograph 51.', 'My measurements contributed to understanding a double helix.', 'My work helped reveal the structure of DNA.']],
    ['Alan Turing', ['Turing', 'Alan Mathison Turing'], 'Alan_Turing', ['I described an abstract machine for studying computation.', 'I worked at Bletchley Park during the Second World War.', 'My wartime work helped break German encrypted messages.', 'I proposed an imitation game to discuss machine intelligence.', 'The test associated with that game bears my surname.']]
  ],
  'movies-entertainment': [
    ['Charlie Chaplin', ['Chaplin', 'Charles Chaplin'], 'Charlie_Chaplin', ['I grew up in London before finding fame in the United States.', 'I co-founded the film company United Artists.', 'I directed Modern Times and The Great Dictator.', 'I was a star of silent cinema.', 'My Little Tramp character wore a bowler hat and carried a cane.']],
    ['Audrey Hepburn', ['Hepburn'], 'Audrey_Hepburn', ['I worked with UNICEF later in my life.', 'I was a British actress associated with classic Hollywood.', 'I played Eliza Doolittle in My Fair Lady.', 'I won an Oscar for Roman Holiday.', 'I starred as Holly Golightly in Breakfast at Tiffany’s.']],
    ['Marilyn Monroe', ['Monroe', 'Norma Jeane Mortenson', 'Norma Jeane Baker'], 'Marilyn_Monroe', ['I was born in Los Angeles in 1926.', 'I appeared in The Seven Year Itch.', 'I starred alongside Tony Curtis and Jack Lemmon in Some Like It Hot.', 'I sang “Diamonds Are a Girl’s Best Friend” on screen.', 'I was a Hollywood star known for platinum-blonde hair.']],
    ['Steven Spielberg', ['Spielberg'], 'Steven_Spielberg', ['I directed the television film Duel early in my career.', 'I directed a film about a friendly visitor stranded on Earth.', 'My films include Jaws and Jurassic Park.', 'I won directing Oscars for Schindler’s List and Saving Private Ryan.', 'I directed E.T. the Extra-Terrestrial.']],
    ['Alfred Hitchcock', ['Hitchcock'], 'Alfred_Hitchcock', ['I was born in London and became known for cameo appearances in my films.', 'I directed Rear Window and Vertigo.', 'One of my films features an attack in a shower at the Bates Motel.', 'I directed The Birds and Psycho.', 'I was a filmmaker nicknamed the Master of Suspense.']],
    ['Walt Disney', ['Disney', 'Walter Disney'], 'Walt_Disney', ['I began my animation career in Kansas City.', 'My studio released Snow White and the Seven Dwarfs in 1937.', 'A California theme park opened under my name in 1955.', 'I co-created Mickey Mouse with Ub Iwerks.', 'I founded an entertainment company with my brother Roy.']],
    ['Oprah Winfrey', ['Oprah', 'Winfrey'], 'Oprah_Winfrey', ['I worked in local broadcasting before national fame.', 'I acted in the 1985 film The Color Purple.', 'I founded a production company called Harpo.', 'My nationally syndicated talk show ran for 25 seasons.', 'I am a television host often known simply by my first name.']],
    ['Bruce Lee', ['Lee', 'Lee Jun Fan'], 'Bruce_Lee', ['I was born in San Francisco and grew up in Hong Kong.', 'I developed a martial arts philosophy known as Jeet Kune Do.', 'I played Kato in The Green Hornet television series.', 'My films include Fist of Fury and Enter the Dragon.', 'I was a martial artist and film star.']],
    ['Elvis Presley', ['Elvis', 'Presley'], 'Elvis_Presley', ['I was born in Tupelo, Mississippi.', 'My home in Memphis became known as Graceland.', 'I recorded for Sun Records before joining RCA.', 'My hits include Jailhouse Rock and Hound Dog.', 'I was known as the King of Rock and Roll.']],
    ['Charlie Watts', ['Watts', 'Charles Watts'], 'Charlie_Watts', ['I trained as a graphic designer.', 'I was a jazz enthusiast as well as a rock musician.', 'I joined an English band in 1963.', 'I played drums alongside Mick Jagger and Keith Richards.', 'I was the longtime drummer of the Rolling Stones.']]
  ],
  'sports-legends': [
    ['Serena Williams', ['Serena'], 'Serena_Williams', ['I won my first Grand Slam singles title at the 1999 US Open.', 'My sister is also a Grand Slam tennis champion.', 'I won 23 Grand Slam singles titles.', 'I won Olympic doubles gold with Venus.', 'I am the younger of two celebrated tennis-playing sisters.']],
    ['Muhammad Ali', ['Ali', 'Cassius Clay', 'Cassius Marcellus Clay'], 'Muhammad_Ali', ['I won Olympic boxing gold at Rome in 1960.', 'I fought Joe Frazier three times as a professional.', 'I fought George Foreman in the Rumble in the Jungle.', 'I became a world heavyweight boxing champion.', 'I was known as “The Greatest.”']],
    ['Usain Bolt', ['Bolt'], 'Usain_Bolt', ['I was born in Jamaica.', 'I won the 100 and 200 metres at three consecutive Olympics.', 'I set world records in the 100 and 200 metres in 2009.', 'My celebratory pose resembles an archer drawing a bow.', 'I ran the 100 metres in 9.58 seconds at the 2009 world championships.']],
    ['Pelé', ['Pele', 'Edson Arantes do Nascimento'], 'Pel%C3%A9', ['I made my World Cup debut as a teenager.', 'I played most of my club career for Santos.', 'I later played for the New York Cosmos.', 'I won three FIFA World Cups with Brazil.', 'I was a Brazilian football icon often called “O Rei,” or “The King.”']],
    ['Michael Jordan', ['Jordan', 'Michael Jeffrey Jordan'], 'Michael_Jordan', ['I played college basketball at the University of North Carolina.', 'I briefly pursued professional baseball.', 'I won six NBA championships with the Chicago Bulls.', 'My basketball shoes are known as Air Jordans.', 'I wore number 23 for the Bulls.']],
    ['Simone Biles', ['Biles'], 'Simone_Biles', ['I won Olympic gymnastics medals in Rio, Tokyo and Paris.', 'Several gymnastics skills are named after me.', 'I compete on vault, uneven bars, balance beam and floor.', 'I won four gold medals at the Rio 2016 Olympics.', 'I won Olympic all-around gold in both 2016 and 2024.']],
    ['Roger Federer', ['Federer'], 'Roger_Federer', ['I won Olympic doubles gold for Switzerland in 2008.', 'I retired after playing doubles with Rafael Nadal at the 2022 Laver Cup.', 'I played famous matches against Nadal and Novak Djokovic.', 'I won 20 Grand Slam singles titles.', 'I won eight Wimbledon men’s singles titles.']],
    ['Nadia Comăneci', ['Nadia Comaneci', 'Comaneci', 'Comăneci'], 'Nadia_Com%C4%83neci', ['I represented Romania at the Olympics.', 'I competed in gymnastics at Montreal in 1976.', 'I was 14 at those Games.', 'The scoreboard displayed 1.00 because it could not show my actual score.', 'I was the first gymnast to receive a perfect Olympic score of 10.0.']],
    ['Jesse Owens', ['Owens', 'James Cleveland Owens'], 'Jesse_Owens', ['I competed for Ohio State University.', 'I set several world records at a 1935 collegiate meet.', 'I won four gold medals at one Olympic Games.', 'Those victories came in Berlin in 1936.', 'I won the 100 metres, 200 metres, long jump and 4 × 100 metres relay there.']],
    ['Billie Jean King', ['Billie Jean', 'King'], 'Billie_Jean_King', ['I won Wimbledon singles six times.', 'I was an advocate for equal prize money in tennis.', 'I helped found the Women’s Tennis Association.', 'I defeated Bobby Riggs in a 1973 exhibition match.', 'That match became known as the Battle of the Sexes.']]
  ],
  'fictional-characters': [
    ['Sherlock Holmes', ['Holmes'], 'Sherlock_Holmes', ['My friend and chronicler is a doctor.', 'I live at 221B Baker Street.', 'My brother Mycroft also has exceptional powers of deduction.', 'I face an adversary named Professor Moriarty.', 'I am Arthur Conan Doyle’s detective.']],
    ['Harry Potter', ['Potter'], 'Harry_Potter_(character)', ['My parents were Lily and James.', 'My friends include Ron Weasley and Hermione Granger.', 'I play Quidditch as a Seeker.', 'I attend Hogwarts School of Witchcraft and Wizardry.', 'I am the boy wizard with a lightning-shaped scar.']],
    ['Frodo Baggins', ['Frodo'], 'Frodo_Baggins', ['My relative and adoptive father is Bilbo.', 'My home is in the Shire.', 'Samwise Gamgee accompanies me on a dangerous journey.', 'I am a hobbit in The Lord of the Rings.', 'I carry the One Ring toward Mount Doom.']],
    ['Elizabeth Bennet', ['Elizabeth', 'Lizzy Bennet', 'Lizzy'], 'Elizabeth_Bennet', ['I have four sisters.', 'My mother is eager for her daughters to marry.', 'My first impressions of a wealthy gentleman prove misleading.', 'That gentleman is Mr. Darcy.', 'I am the heroine of Jane Austen’s Pride and Prejudice.']],
    ['Hercule Poirot', ['Poirot'], 'Hercule_Poirot', ['I am a former Belgian police officer.', 'I take pride in my moustache.', 'I describe my method as using the “little grey cells.”', 'I investigate a murder on the Orient Express.', 'I am a detective created by Agatha Christie.']],
    ['Peter Pan', ['Peter'], 'Peter_Pan', ['I visit the Darling children in London.', 'A fairy named Tinker Bell is my companion.', 'My enemies include Captain Hook.', 'I lead the Lost Boys in Neverland.', 'I am the boy who would not grow up.']],
    ['Winnie-the-Pooh', ['Winnie the Pooh', 'Pooh', 'Winnie Pooh'], 'Winnie-the-Pooh', ['I live in the Hundred Acre Wood.', 'My friends include Piglet and Eeyore.', 'I enjoy a snack I call “hunny.”', 'Christopher Robin is one of my friends.', 'I am A. A. Milne’s honey-loving bear.']],
    ['Alice', ['Alice in Wonderland'], 'Alice%27s_Adventures_in_Wonderland', ['I follow a white rabbit.', 'I meet a character who holds an unusual tea party.', 'I encounter the Cheshire Cat and the Queen of Hearts.', 'I fall down a rabbit hole into a strange world.', 'I am the young visitor to Lewis Carroll’s Wonderland.']],
    ['Dracula', ['Count Dracula'], 'Count_Dracula', ['I appear in an 1897 novel told through letters and diaries.', 'A lawyer named Jonathan Harker visits my castle.', 'My home is in Transylvania.', 'Professor Van Helsing opposes me.', 'I am Bram Stoker’s vampire count.']],
    ['Robin Hood', ['Robin'], 'Robin_Hood', ['I am a legendary figure in English ballads.', 'I am famed as an outlaw archer.', 'My companions are known as the Merry Men.', 'My adversary is the Sheriff of Nottingham.', 'Legend places me in Sherwood Forest, robbing the rich to help the poor.']]
  ],
  'famous-people': [
    ['William Shakespeare', ['Shakespeare', 'The Bard'], 'William_Shakespeare', ['I was born in Stratford-upon-Avon.', 'I was associated with the Globe Theatre.', 'My plays include Macbeth and Hamlet.', 'I wrote a tragedy about Romeo and Juliet.', 'I am often called the Bard of Avon.']],
    ['Frida Kahlo', ['Kahlo'], 'Frida_Kahlo', ['I was born in Coyoacán, Mexico.', 'A serious bus accident affected my life and art.', 'I married the muralist Diego Rivera.', 'My paintings include many self-portraits.', 'I was a Mexican artist known for striking self-portraits.']],
    ['Leonardo da Vinci', ['Leonardo', 'Da Vinci'], 'Leonardo_da_Vinci', ['I filled notebooks with drawings and observations.', 'I painted a mural of the Last Supper in Milan.', 'I studied anatomy and designed flying machines.', 'I painted the Mona Lisa.', 'I was an Italian Renaissance artist and inventor.']],
    ['Jane Austen', ['Austen'], 'Jane_Austen', ['I published novels anonymously during my lifetime.', 'My novels often examine marriage and social class.', 'I wrote Sense and Sensibility and Emma.', 'I created Elizabeth Bennet and Mr. Darcy.', 'I wrote Pride and Prejudice.']],
    ['Wolfgang Amadeus Mozart', ['Mozart', 'Wolfgang Mozart'], 'Wolfgang_Amadeus_Mozart', ['I was born in Salzburg in 1756.', 'I toured Europe as a child musician.', 'I composed a Requiem left unfinished at my death.', 'My operas include The Magic Flute and The Marriage of Figaro.', 'I was a celebrated Austrian composer with the middle name Amadeus.']],
    ['Vincent van Gogh', ['Van Gogh', 'Vincent van Gogh'], 'Vincent_van_Gogh', ['I exchanged many letters with my brother Theo.', 'I worked in Arles in southern France.', 'My paintings include Sunflowers and The Starry Night.', 'I was a Dutch post-impressionist painter.', 'An incident involving my ear became a famous part of my story.']],
    ['Pablo Picasso', ['Picasso'], 'Pablo_Picasso', ['I was born in Málaga, Spain.', 'My early work includes a Blue Period.', 'I painted Guernica in response to a bombing during the Spanish Civil War.', 'I developed Cubism with Georges Braque.', 'I was a Spanish artist named Pablo.']],
    ['Ludwig van Beethoven', ['Beethoven'], 'Ludwig_van_Beethoven', ['I was born in Bonn and worked in Vienna.', 'My only opera is Fidelio.', 'My hearing declined as I continued composing.', 'My Ninth Symphony includes the Ode to Joy.', 'My Fifth Symphony begins with a famous four-note motif.']],
    ['Agatha Christie', ['Christie', 'Dame Agatha Christie'], 'Agatha_Christie', ['I worked in a hospital dispensary during the First World War.', 'I wrote the long-running play The Mousetrap.', 'My detectives include Miss Marple.', 'I created Hercule Poirot.', 'I was a British writer known for mystery novels.']],
    ['Maya Angelou', ['Angelou'], 'Maya_Angelou', ['I worked as a performer before becoming widely known as a writer.', 'I recited a poem at President Bill Clinton’s inauguration.', 'I wrote the poem “Still I Rise.”', 'My autobiographical writing begins with I Know Why the Caged Bird Sings.', 'I was an American poet, performer and civil rights activist.']]
  ]
};

const explanations = {
  'historical-figures': [
    'Cleopatra VII ruled Ptolemaic Egypt and formed alliances with Julius Caesar and Mark Antony.',
    'Julius Caesar was a Roman general and dictator whose assassination came in 44 BCE.',
    'Napoleon ruled as French emperor and was defeated at Waterloo in 1815.',
    'Joan of Arc supported the French cause during the Hundred Years’ War and helped lift the siege of Orléans.',
    'Gandhi led nonviolent campaigns against British rule and discriminatory laws.',
    'Mandela opposed apartheid and became South Africa’s first Black president.',
    'Lincoln led the United States during the Civil War and issued the Emancipation Proclamation.',
    'Victoria ruled the United Kingdom from 1837 to 1901, giving her name to an era.',
    'King was a civil rights leader whose 1963 Washington speech included “I have a dream.”',
    'Alexander conquered a vast territory stretching from Greece into Asia.'
  ],
  'scientists-inventors': [
    'Einstein developed the theories of relativity and explained aspects of the photoelectric effect.',
    'Curie researched radioactivity and received Nobel Prizes in physics and chemistry.',
    'Newton described laws of motion and universal gravitation in his Principia.',
    'Darwin proposed natural selection as a mechanism of evolution.',
    'Lovelace wrote notes on Babbage’s Analytical Engine, including an algorithm for Bernoulli numbers.',
    'Galileo used a telescope to study Jupiter’s moons and the phases of Venus.',
    'Tesla developed an alternating-current induction motor and contributed to AC power technology.',
    'Fleming discovered penicillin after observing a mold’s effect on bacteria.',
    'Franklin’s X-ray diffraction work contributed to understanding the structure of DNA.',
    'Turing contributed to the theory of computation and wartime codebreaking.'
  ],
  'movies-entertainment': [
    'Chaplin’s Little Tramp became an enduring figure of silent cinema.',
    'Hepburn won an Oscar for Roman Holiday and starred in Breakfast at Tiffany’s.',
    'Monroe starred in films including Some Like It Hot and The Seven Year Itch.',
    'Spielberg directed films including Jaws, E.T. and Schindler’s List.',
    'Hitchcock directed influential suspense films including Psycho and Rear Window.',
    'Disney co-created Mickey Mouse and opened Disneyland in California.',
    'Winfrey hosted a long-running syndicated television talk show and founded Harpo.',
    'Lee was a martial artist and actor who developed Jeet Kune Do.',
    'Presley helped popularize rock and roll and lived at Graceland in Memphis.',
    'Watts was the Rolling Stones’ drummer and also played jazz.'
  ],
  'sports-legends': [
    'Williams won 23 Grand Slam singles titles and Olympic doubles gold with her sister Venus.',
    'Ali was an Olympic gold medalist and world heavyweight boxing champion.',
    'Bolt set 100- and 200-metre world records at the 2009 world championships.',
    'Pelé won three World Cups with Brazil and played for Santos and the New York Cosmos.',
    'Jordan won six NBA championships with the Chicago Bulls.',
    'Biles won four gymnastics gold medals at the Rio 2016 Olympics.',
    'Federer won 20 Grand Slam singles titles, including eight at Wimbledon.',
    'Comăneci earned the first perfect 10 in Olympic gymnastics at Montreal in 1976.',
    'Owens won four track and field gold medals at the 1936 Berlin Olympics.',
    'King championed equality in tennis and defeated Bobby Riggs in the Battle of the Sexes.'
  ],
  'fictional-characters': [
    'Holmes is Arthur Conan Doyle’s detective, known for his deductions and his Baker Street address.',
    'Harry Potter is a student at Hogwarts and a central character in J. K. Rowling’s novels.',
    'Frodo carries the One Ring toward Mount Doom in Tolkien’s The Lord of the Rings.',
    'Elizabeth Bennet is the heroine of Jane Austen’s Pride and Prejudice.',
    'Poirot is Agatha Christie’s Belgian detective, known for his moustache and “little grey cells.”',
    'Peter Pan is J. M. Barrie’s boy who lives in Neverland and refuses to grow up.',
    'Winnie-the-Pooh is A. A. Milne’s honey-loving bear from the Hundred Acre Wood.',
    'Alice explores Wonderland after following a white rabbit in Lewis Carroll’s story.',
    'Count Dracula is the vampire antagonist of Bram Stoker’s 1897 novel.',
    'Robin Hood is a legendary outlaw associated with Sherwood Forest and the Merry Men.'
  ],
  'famous-people': [
    'Shakespeare wrote plays including Hamlet and Romeo and Juliet.',
    'Kahlo was a Mexican painter celebrated for her self-portraits.',
    'Leonardo painted the Mona Lisa and the Last Supper and kept notebooks on science and engineering.',
    'Austen wrote novels including Pride and Prejudice and Emma.',
    'Mozart composed operas including The Magic Flute and The Marriage of Figaro.',
    'Van Gogh painted The Starry Night and corresponded extensively with his brother Theo.',
    'Picasso helped develop Cubism and painted Guernica.',
    'Beethoven continued composing after his hearing declined and wrote the Ninth Symphony.',
    'Christie created the detectives Hercule Poirot and Miss Marple.',
    'Angelou wrote I Know Why the Caged Bird Sings and recited a poem at a presidential inauguration.'
  ]
};

const extraSources = {
  'Albert Einstein': { name: 'Nobel Prize', url: 'https://www.nobelprize.org/prizes/physics/1921/summary/' },
  'Rosalind Franklin': { name: 'Science History Institute', url: 'https://digital.sciencehistory.org/works/mjir8wn/viewer/z61b0g6' },
  'Usain Bolt': { name: 'Olympics.com', url: 'https://www.olympics.com/en/news/usain-bolt-record-world-champion-athlete-fastest-man-olympics-sprinter-100m-200m' },
  'Nadia Comăneci': { name: 'Olympics.com', url: 'https://www.olympics.com/en/news/perfect-comaneci-rewrites-olympic-history-gymnastics' },
  'William Shakespeare': { name: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/summary/William-Shakespeare' }
};

const bank = Object.entries(groups).flatMap(([category, rows]) => rows.map(([answer, aliases, article, clues], index) => {
  const slug = answer.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `${category}-${slug}`, category, type: category === 'fictional-characters' ? 'fictional_character' : 'real_person',
    answer, acceptedAnswers: [...new Set([answer, ...aliases])], clues,
    explanation: explanations[category][index],
    sources: [{ name: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${article}` }, ...(extraSources[answer] ? [extraSources[answer]] : [])]
  };
}));
fs.writeFileSync(path.join(__dirname, '..', 'data', 'who-am-i.json'), `${JSON.stringify(bank, null, 2)}\n`);
