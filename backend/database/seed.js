require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/utils/db');

const words = [
  {
    borrowed_word: 'investigoj',
    correct_albanian: 'hetoj',
    category: 'Folje',
    definition: 'Të bësh hetime, të kërkosh të vërtetën për një ngjarje.',
    example: 'Policia po heton rastin e vjedhjes.',
    conjugations: [
      { type: 'E tashmja', text: 'hetoj, heton, hetojmë, hetoni, hetojnë' },
      { type: 'E kryer', text: 'hetova, hetove, hetoi, hetuam, hetuat, hetuan' },
      { type: 'E ardhmja', text: 'do të hetoj, do të hetosh, do të hetojë' },
      { type: 'Pjesorja', text: 'hetuar' },
    ],
  },
  {
    borrowed_word: 'marketing',
    correct_albanian: 'tregtim',
    category: 'Emër',
    definition: 'Aktivitete që lidhen me reklamimin dhe shitjen e produkteve.',
    example: 'Kompania investoi shumë në tregtim.',
  },
  {
    borrowed_word: 'manager',
    correct_albanian: 'drejtues',
    category: 'Emër',
    definition: 'Person që drejton një ekip ose kompani.',
    example: 'Drejtuesja e re filloi punën sot.',
  },
  {
    borrowed_word: 'email',
    correct_albanian: 'postë elektronike',
    category: 'Emër',
    definition: 'Mesazh i dërguar përmes internetit.',
    example: 'Më dërgo një postë elektronike me detajet.',
  },
  {
    borrowed_word: 'weekend',
    correct_albanian: 'fundjavë',
    category: 'Emër',
    definition: 'Dita e shtunë dhe e diel.',
    example: 'Fundjavën do të shkojmë në mal.',
  },
  {
    borrowed_word: 'shopping',
    correct_albanian: 'blerje',
    category: 'Emër',
    definition: 'Veprimi i blerjes së gjërave nga dyqanet.',
    example: 'Do të dal për blerje pasdite.',
  },
  {
    borrowed_word: 'parking',
    correct_albanian: 'parkim',
    category: 'Emër',
    definition: 'Vend ku parkohen makinat.',
    example: 'Nuk gjeta parkim afër qendrës.',
  },
  {
    borrowed_word: 'download',
    correct_albanian: 'shkarkoj',
    category: 'Folje',
    definition: 'Të marrësh një skedar nga interneti.',
    example: 'Shkarkova aplikacionin e ri.',
    conjugations: [
      { type: 'E tashmja', text: 'shkarkoj, shkarkon, shkarkojmë, shkarkoni, shkarkojnë' },
      { type: 'E kryer', text: 'shkarkova, shkarkove, shkarkoi, shkarkuam, shkarkuat, shkarkuan' },
      { type: 'Pjesorja', text: 'shkarkuar' },
    ],
  },
  {
    borrowed_word: 'upload',
    correct_albanian: 'ngarkoj',
    category: 'Folje',
    definition: 'Të dërgosh një skedar në internet.',
    example: 'Po ngarkoj fotografitë në sistem.',
    conjugations: [
      { type: 'E tashmja', text: 'ngarkoj, ngarkon, ngarkojmë, ngarkoni, ngarkojnë' },
      { type: 'E kryer', text: 'ngarkova, ngarkove, ngarkoi, ngarkuam, ngarkuat, ngarkuan' },
      { type: 'Pjesorja', text: 'ngarkuar' },
    ],
  },
  {
    borrowed_word: 'meeting',
    correct_albanian: 'mbledhje',
    category: 'Emër',
    definition: 'Takim zyrtar për të diskutuar punë.',
    example: 'Kemi mbledhje nesër në mëngjes.',
  },
  {
    borrowed_word: 'deadline',
    correct_albanian: 'afat',
    category: 'Emër',
    definition: 'Koha e fundit për të përfunduar diçka.',
    example: 'Afati për projektin është të premten.',
  },
  {
    borrowed_word: 'feedback',
    correct_albanian: 'vlerësim',
    category: 'Emër',
    definition: 'Komente ose mendime për diçka.',
    example: 'Mësuesi na dha vlerësim për punën.',
  },
  {
    borrowed_word: 'target',
    correct_albanian: 'objektiv',
    category: 'Emër',
    definition: 'Qëllim që duhet arritur.',
    example: 'Objektivi ynë është të rrisim shitjet.',
  },
  {
    borrowed_word: 'challenge',
    correct_albanian: 'sfidë',
    category: 'Emër',
    definition: 'Detyrë e vështirë që kërkon përpjekje.',
    example: 'Ky projekt është një sfidë e madhe.',
  },
  {
    borrowed_word: 'budget',
    correct_albanian: 'buxhet',
    category: 'Emër',
    definition: 'Paraja që planifikohet të shpenzohet.',
    example: 'Buxheti vjetor u aprovua nga bordi.',
  },
  {
    borrowed_word: 'business',
    correct_albanian: 'biznes',
    category: 'Emër',
    definition: 'Veprimtari tregtare për fitim.',
    example: 'Ai hapi një biznes të vogël.',
  },
  {
    borrowed_word: 'software',
    correct_albanian: 'program',
    category: 'Emër',
    definition: 'Programi që përdoret në kompjuter.',
    example: 'Instalova një program të ri.',
  },
  {
    borrowed_word: 'password',
    correct_albanian: 'fjalëkalim',
    category: 'Emër',
    definition: 'Kod sekret për të hyrë në sistem.',
    example: 'Harrova fjalëkalimin e emailit.',
  },
  {
    borrowed_word: 'team',
    correct_albanian: 'ekip',
    category: 'Emër',
    definition: 'Grup njerëzish që punojnë së bashku.',
    example: 'Ekipi ynë fitoi ndeshjen.',
  },
  {
    borrowed_word: 'office',
    correct_albanian: 'zyrë',
    category: 'Emër',
    definition: 'Vend ku bëhet puna administrative.',
    example: 'Zyra është në katin e dytë.',
  },
  {
    borrowed_word: 'network',
    correct_albanian: 'rrjet',
    category: 'Emër',
    definition: 'Sistem i lidhur kompjuterësh ose njerëzish.',
    example: 'Rrjeti i internetit nuk funksionon.',
  },
];

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('Fjalor123!', 10);
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING *`,
      ['admin@shkolla7marsi.edu.al', passwordHash, 'Administratori']
    );

    for (const word of words) {
      const wordResult = await client.query(
        `INSERT INTO words
         (borrowed_word, correct_albanian, category, is_verified, added_by)
         VALUES ($1, $2, $3, true, $4)
         ON CONFLICT (borrowed_word)
         DO UPDATE SET correct_albanian = EXCLUDED.correct_albanian, category = EXCLUDED.category
         RETURNING *`,
        [word.borrowed_word, word.correct_albanian, word.category, adminResult.rows[0].id]
      );

      const wordId = wordResult.rows[0].id;

      await client.query('DELETE FROM definitions WHERE word_id = $1', [wordId]);
      await client.query(
        `INSERT INTO definitions (word_id, definition_text, example_sentence, definition_order)
         VALUES ($1, $2, $3, 1)`,
        [wordId, word.definition, word.example]
      );

      await client.query('DELETE FROM conjugations WHERE word_id = $1', [wordId]);
      if (word.conjugations) {
        for (const conjugation of word.conjugations) {
          await client.query(
            `INSERT INTO conjugations (word_id, conjugation_type, conjugation_text)
             VALUES ($1, $2, $3)`,
            [wordId, conjugation.type, conjugation.text]
          );
        }
      }
    }

    const firstWordId = await client.query('SELECT id FROM words ORDER BY id ASC LIMIT 1');
    if (firstWordId.rows.length) {
      await client.query(
        `INSERT INTO word_of_the_day (word_id, display_date)
         VALUES ($1, CURRENT_DATE)
         ON CONFLICT (display_date) DO UPDATE SET word_id = EXCLUDED.word_id`,
        [firstWordId.rows[0].id]
      );
    }

    await client.query('COMMIT');

    const countResult = await client.query('SELECT COUNT(*) AS count FROM words');
    const wordCount = countResult.rows[0]?.count ?? 0;
    const wotdResult = await client.query('SELECT COUNT(*) AS count FROM word_of_the_day WHERE display_date = CURRENT_DATE');
    const wotdSet = (wotdResult.rows[0]?.count ?? 0) > 0;

    console.log(`Seed completed: ${wordCount} words in database, word of the day ${wotdSet ? 'set' : 'not set'}.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
