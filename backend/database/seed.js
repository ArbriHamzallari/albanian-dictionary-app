require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const pool = require('../src/utils/db');
const { validateExercise } = require('../src/utils/exerciseSchemas');

const isProduction = process.env.NODE_ENV === 'production';
const adminEmail = process.env.ADMIN_EMAIL || (isProduction ? null : 'admin@fjalingo.al');
const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? null : 'Fjalor123!');
if (isProduction && (!adminEmail || !adminPassword)) {
  console.error('In production set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env. Do not use default credentials.');
  process.exit(1);
}

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

// ─────────────────────────────────────────────────────────────
// Starter curriculum (DEV-ONLY - see the !isProduction guard in seed()).
// 2 units, 2 lessons each, 5 exercises per lesson (mix of all three types).
// NOTE: the Albanian replacements below are my best authoring; please confirm
// the less-common ones (schedule -> orar, feedback -> vlerësim, team -> ekip)
// before relying on them in production content.
// ─────────────────────────────────────────────────────────────
const curriculum = [
  {
    slug: 'technology-alblish',
    title: 'Technology Alblish',
    description: 'Fjalët e teknologjisë që i themi në anglisht — dhe fjala jonë shqipe.',
    icon: '💻',
    color: '#2BB673',
    is_premium_unit: false,
    lessons: [
      {
        slug: 'tech-words-1',
        title: 'Fjalë teknologjie 1',
        exercises: [
          {
            type: 'spot_alblish',
            prompt: { sentence: 'Më duhet të bëj download skedarin para mbledhjes.' },
            answer: {
              loanword: 'download',
              corrected_sentence: 'Më duhet të shkarkoj skedarin para mbledhjes.',
              correct_albanian: 'shkarkoj',
            },
            why_it_matters: "'download' erdhi me kompjuterët nga anglishtja. 'shkarkoj' është fjala jonë — e qartë dhe e plotë.",
          },
          {
            type: 'translation',
            prompt: { loanword: 'software', options: ['program', 'pajisje', 'ekran', 'rrjet'] },
            answer: { correct: 'program' },
            why_it_matters: "'software' = 'program'. Shqipja e ka fjalën e vet.",
          },
          {
            type: 'fill_blank',
            prompt: {
              sentence: 'Më duhet një {{blank}} i fortë për llogarinë.',
              options: ['fjalëkalim', 'program', 'skedar', 'ekran'],
            },
            answer: { correct: 'fjalëkalim' },
            why_it_matters: "'password' = 'fjalëkalim'.",
          },
          {
            type: 'spot_alblish',
            prompt: { sentence: 'Dua të bëj upload fotot në sistem.' },
            answer: {
              loanword: 'upload',
              corrected_sentence: 'Dua të ngarkoj fotot në sistem.',
              correct_albanian: 'ngarkoj',
            },
            why_it_matters: "'upload' = 'ngarkoj'. E kundërta e 'shkarkoj'.",
          },
          {
            type: 'translation',
            prompt: { loanword: 'email', options: ['postë elektronike', 'skedar', 'lidhje', 'program'] },
            answer: { correct: 'postë elektronike' },
            why_it_matters: "'email' = 'postë elektronike' (shkurt: 'postë').",
          },
        ],
      },
      {
        slug: 'tech-words-2',
        title: 'Fjalë teknologjie 2',
        exercises: [
          {
            type: 'spot_alblish',
            prompt: { sentence: 'Kliko mbi link-un për të vazhduar.' },
            answer: {
              loanword: 'link',
              corrected_sentence: 'Kliko mbi lidhjen për të vazhduar.',
              correct_albanian: 'lidhje',
            },
            why_it_matters: "'link' = 'lidhje'.",
          },
          {
            type: 'fill_blank',
            prompt: {
              sentence: 'Doli një {{blank}} i ri për aplikacionin.',
              options: ['përditësim', 'program', 'skedar', 'ekran'],
            },
            answer: { correct: 'përditësim' },
            why_it_matters: "'update' = 'përditësim'.",
          },
          {
            type: 'translation',
            prompt: { loanword: 'file', options: ['skedar', 'ekran', 'lidhje', 'program'] },
            answer: { correct: 'skedar' },
            why_it_matters: "'file' = 'skedar'.",
          },
          {
            type: 'spot_alblish',
            prompt: { sentence: 'Do të bëj save dokumentin tani.' },
            answer: {
              loanword: 'save',
              corrected_sentence: 'Do ta ruaj dokumentin tani.',
              correct_albanian: 'ruaj',
            },
            why_it_matters: "'save' = 'ruaj'.",
          },
          {
            type: 'translation',
            prompt: { loanword: 'delete', options: ['fshij', 'ruaj', 'ngarkoj', 'shkarkoj'] },
            answer: { correct: 'fshij' },
            why_it_matters: "'delete' = 'fshij'.",
          },
        ],
      },
    ],
  },
  {
    slug: 'office-alblish',
    title: 'Office Alblish',
    description: 'Fjalët e zyrës që i përziejmë me anglishten — dhe shqipja e vërtetë.',
    icon: '🗂️',
    color: '#8B7FF5',
    is_premium_unit: false,
    lessons: [
      {
        slug: 'office-words-1',
        title: 'Fjalë zyre 1',
        exercises: [
          {
            type: 'spot_alblish',
            prompt: { sentence: 'Kemi një meeting të rëndësishëm nesër.' },
            answer: {
              loanword: 'meeting',
              corrected_sentence: 'Kemi një takim të rëndësishëm nesër.',
              correct_albanian: 'takim',
            },
            why_it_matters: "'meeting' hyri nga anglishtja pas viteve '90. 'takim' është fjala jonë — ajo që përdorte gjyshja.",
          },
          {
            type: 'translation',
            prompt: { loanword: 'deadline', options: ['afat', 'takim', 'objektiv', 'orar'] },
            answer: { correct: 'afat' },
            why_it_matters: "'deadline' = 'afat'.",
          },
          {
            type: 'fill_blank',
            prompt: {
              sentence: 'Drejtuesi caktoi një {{blank}} të ri për ekipin.',
              options: ['objektiv', 'afat', 'takim', 'orar'],
            },
            answer: { correct: 'objektiv' },
            why_it_matters: "'target' = 'objektiv'.",
          },
          {
            type: 'spot_alblish',
            prompt: { sentence: 'Fola me manager-in për projektin.' },
            answer: {
              loanword: 'manager',
              corrected_sentence: 'Fola me drejtuesin për projektin.',
              correct_albanian: 'drejtues',
            },
            why_it_matters: "'manager' = 'drejtues'.",
          },
          {
            type: 'translation',
            prompt: { loanword: 'office', options: ['zyrë', 'takim', 'afat', 'ekip'] },
            answer: { correct: 'zyrë' },
            why_it_matters: "'office' = 'zyrë'.",
          },
        ],
      },
      {
        slug: 'office-words-2',
        title: 'Fjalë zyre 2',
        exercises: [
          {
            type: 'spot_alblish',
            prompt: { sentence: 'Më dha një feedback shumë të mirë.' },
            answer: {
              loanword: 'feedback',
              corrected_sentence: 'Më dha një vlerësim shumë të mirë.',
              correct_albanian: 'vlerësim',
            },
            why_it_matters: "'feedback' = 'vlerësim' (ose 'koment'). Zgjedh fjalën shqip.",
          },
          {
            type: 'translation',
            prompt: { loanword: 'team', options: ['ekip', 'zyrë', 'takim', 'afat'] },
            answer: { correct: 'ekip' },
            why_it_matters: "'team' = 'ekip'.",
          },
          {
            type: 'fill_blank',
            prompt: {
              sentence: 'Ndryshuam {{blank}} e takimeve për këtë javë.',
              options: ['orarin', 'afatin', 'objektivin', 'vlerësimin'],
            },
            answer: { correct: 'orarin' },
            why_it_matters: "'schedule' = 'orar'.",
          },
          {
            type: 'spot_alblish',
            prompt: { sentence: 'Cili është deadline për raportin?' },
            answer: {
              loanword: 'deadline',
              corrected_sentence: 'Cili është afati për raportin?',
              correct_albanian: 'afat',
            },
            why_it_matters: "'deadline' = 'afat'.",
          },
          {
            type: 'translation',
            prompt: { loanword: 'target', options: ['objektiv', 'ekip', 'orar', 'zyrë'] },
            answer: { correct: 'objektiv' },
            why_it_matters: "'target' = 'objektiv'.",
          },
        ],
      },
    ],
  },
];

const seedCurriculum = async (client) => {
  let unitOrder = 0;
  for (const unit of curriculum) {
    const unitResult = await client.query(
      `INSERT INTO units (slug, title, description, icon, color, order_index, is_premium_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         color = EXCLUDED.color,
         order_index = EXCLUDED.order_index,
         is_premium_unit = EXCLUDED.is_premium_unit,
         updated_at = now()
       RETURNING id`,
      [unit.slug, unit.title, unit.description, unit.icon, unit.color, unitOrder, unit.is_premium_unit]
    );
    const unitId = unitResult.rows[0].id;
    unitOrder += 1;

    let lessonOrder = 0;
    for (const lesson of unit.lessons) {
      const lessonResult = await client.query(
        `INSERT INTO lessons (unit_id, slug, title, order_index)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (unit_id, slug) DO UPDATE SET
           title = EXCLUDED.title,
           order_index = EXCLUDED.order_index,
           updated_at = now()
         RETURNING id`,
        [unitId, lesson.slug, lesson.title, lessonOrder]
      );
      const lessonId = lessonResult.rows[0].id;
      lessonOrder += 1;

      let exerciseOrder = 0;
      for (const exercise of lesson.exercises) {
        // Fail fast: every seeded exercise must satisfy its type's schema.
        const payload = {
          lesson_id: lessonId,
          order_index: exerciseOrder,
          type: exercise.type,
          prompt: exercise.prompt,
          answer: exercise.answer,
          why_it_matters: exercise.why_it_matters,
        };
        const { error, value } = validateExercise(payload);
        if (error) {
          throw new Error(`Invalid seed exercise (${unit.slug}/${lesson.slug} #${exerciseOrder}): ${error.message}`);
        }

        await client.query(
          `INSERT INTO exercises (lesson_id, order_index, type, prompt, answer, why_it_matters)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
           ON CONFLICT (lesson_id, order_index) DO UPDATE SET
             type = EXCLUDED.type,
             prompt = EXCLUDED.prompt,
             answer = EXCLUDED.answer,
             why_it_matters = EXCLUDED.why_it_matters,
             updated_at = now()`,
          [
            lessonId,
            exerciseOrder,
            value.type,
            JSON.stringify(value.prompt),
            JSON.stringify(value.answer),
            value.why_it_matters || null,
          ]
        );
        exerciseOrder += 1;
      }
    }
  }
};

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminUsername = (adminEmail || '').split('@')[0] || 'admin';
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, username, username_normalized, avatar_filename)
       VALUES ($1, $2, $3, 'admin', $4, $5, 'default.png')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING *`,
      [adminEmail, passwordHash, 'Administratori', adminUsername, adminUsername.toLowerCase()]
    );

    // Ensure admin has a uuid (backfill if migration ran after initial seed)
    if (!adminResult.rows[0].uuid) {
      await client.query(
        `UPDATE users SET uuid = gen_random_uuid() WHERE id = $1 AND uuid IS NULL`,
        [adminResult.rows[0].id]
      );
    }

    // The admin is created here, not via /register, so it needs its 1:1
    // user_stats row explicitly — otherwise submitQuiz returns 404
    // "Statistikat nuk u gjetën" when the admin takes a quiz. Re-read the uuid
    // in case it was just backfilled above.
    const adminUuid = (
      await client.query(`SELECT uuid FROM users WHERE id = $1`, [adminResult.rows[0].id])
    ).rows[0].uuid;
    await client.query(
      `INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [adminUuid]
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

    const allWords = await client.query(
      'SELECT id, borrowed_word, correct_albanian FROM words ORDER BY id'
    );
    for (const word of allWords.rows) {
      const wrongAnswers = allWords.rows
        .filter((other) => other.id !== word.id)
        .map((other) => other.correct_albanian)
        .slice(0, 3);
      if (wrongAnswers.length < 1) {
        continue;
      }

      await client.query('DELETE FROM quiz_questions WHERE word_id = $1', [word.id]);
      await client.query(
        `INSERT INTO quiz_questions
         (word_id, question_text, correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [
          word.id,
          word.borrowed_word,
          word.correct_albanian,
          wrongAnswers[0],
          wrongAnswers[1] || wrongAnswers[0],
          wrongAnswers[2] || wrongAnswers[0],
        ]
      );
    }

    // Dev-only: starter curriculum (units -> lessons -> exercises).
    if (!isProduction) {
      await seedCurriculum(client);
    }

    await client.query('COMMIT');

    const countResult = await client.query('SELECT COUNT(*) AS count FROM words');
    const wordCount = countResult.rows[0]?.count ?? 0;
    const wotdResult = await client.query('SELECT COUNT(*) AS count FROM word_of_the_day WHERE display_date = CURRENT_DATE');
    const wotdSet = (wotdResult.rows[0]?.count ?? 0) > 0;

    let curriculumSummary = 'skipped (production)';
    if (!isProduction) {
      const unitsCount = await client.query('SELECT COUNT(*) AS count FROM units');
      const lessonsCount = await client.query('SELECT COUNT(*) AS count FROM lessons');
      const exercisesCount = await client.query('SELECT COUNT(*) AS count FROM exercises');
      curriculumSummary = `${unitsCount.rows[0].count} units, ${lessonsCount.rows[0].count} lessons, ${exercisesCount.rows[0].count} exercises`;
    }

    console.log(`Seed completed: ${wordCount} words in database, word of the day ${wotdSet ? 'set' : 'not set'}.`);
    console.log(`Curriculum: ${curriculumSummary}.`);
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
