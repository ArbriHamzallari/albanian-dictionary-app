/**
 * One-off seed: add extra words from dataset.
 * Uses ON CONFLICT (borrowed_word) DO NOTHING so existing words are skipped (no duplicates).
 * Requires: admin user and existing DB schema. Run from repo root: node backend/database/seed-extra-words.js
 */
require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/utils/db');

const EXTRA_WORDS = [
  {
    borrowed_word: 'aplikoj',
    correct_albanian: 'zbatoj',
    definition: 'Të zbatosh diçka, ta vësh në praktikë.',
    example: 'Zbatojmë rregullat e reja.',
    present: 'zbatoj, zbaton, zbatojmë, zbatoni, zbatojnë',
    past: 'zbatova, zbatove, zbatoi, zbatuam, zbatuat, zbatuan',
    future: 'do të zbatoj',
    participle: 'zbatuar',
  },
  {
    borrowed_word: 'aprovoj',
    correct_albanian: 'miratoj',
    definition: 'Të miratosh zyrtarisht diçka.',
    example: 'Drejtori miratoi projektin.',
    present: 'miratoj, miraton, miratojmë, miratoni, miratojnë',
    past: 'miratova, miratove, miratoi, miratuam, miratuat, miratuan',
    future: 'do të miratoj',
    participle: 'miratuar',
  },
  {
    borrowed_word: 'analizoj',
    correct_albanian: 'shqyrtoj',
    definition: 'Të shqyrtosh me kujdes, të analizosh.',
    example: 'Shqyrtova dokumentin me kujdes.',
    present: 'shqyrtoj, shqyrton, shqyrtojmë, shqyrtoni, shqyrtojnë',
    past: 'shqyrtova, shqyrtove, shqyrtoi, shqyrtuam, shqyrtuat, shqyrtuan',
    future: 'do të shqyrtoj',
    participle: 'shqyrtuar',
  },
  {
    borrowed_word: 'downloadoj',
    correct_albanian: 'shkarkoj',
    definition: 'Të marrësh një skedar nga interneti.',
    example: 'Shkarkova aplikacionin e ri.',
    present: 'shkarkoj, shkarkon, shkarkojmë, shkarkoni, shkarkojnë',
    past: 'shkarkova, shkarkove, shkarkoi, shkarkuam, shkarkuat, shkarkuan',
    future: 'do të shkarkoj',
    participle: 'shkarkuar',
  },
  {
    borrowed_word: 'uploadoj',
    correct_albanian: 'ngarkoj',
    definition: 'Të dërgosh një skedar në internet.',
    example: 'Po ngarkoj fotografitë në sistem.',
    present: 'ngarkoj, ngarkon, ngarkojmë, ngarkoni, ngarkojnë',
    past: 'ngarkova, ngarkove, ngarkoi, ngarkuam, ngarkuat, ngarkuan',
    future: 'do të ngarkoj',
    participle: 'ngarkuar',
  },
  {
    borrowed_word: 'supportoj',
    correct_albanian: 'mbështes',
    definition: 'Të mbështesësh dikë a diçka.',
    example: 'E mbështetim në projekt.',
    present: 'mbështes, mbështet, mbështesim, mbështetni, mbështesin',
    past: 'mbështeta, mbështete, mbështeti, mbështetëm, mbështetët, mbështetën',
    future: 'do të mbështes',
    participle: 'mbështetur',
  },
  {
    borrowed_word: 'organizoj',
    correct_albanian: 'rregulloj',
    definition: 'Të rregullosh, të organizosh diçka.',
    example: 'Rregullova dokumentet në dosje.',
    present: 'rregulloj, rregullon, rregullojmë, rregulloni, rregullojnë',
    past: 'rregullova, rregullove, rregulloi, rregulluam, rregulluat, rregulluan',
    future: 'do të rregulloj',
    participle: 'rregulluar',
  },
  {
    borrowed_word: 'kontrolloj',
    correct_albanian: 'verifikoj',
    definition: 'Të verifikosh, të kontrollosh të vërtetën.',
    example: 'Verifikova adresën e emailit.',
    present: 'verifikoj, verifikon, verifikojmë, verifikoni, verifikojnë',
    past: 'verifikova, verifikove, verifikoi, verifikuam, verifikuat, verifikuan',
    future: 'do të verifikoj',
    participle: 'verifikuar',
  },
  {
    borrowed_word: 'menaxhoj',
    correct_albanian: 'drejtoj',
    definition: 'Të drejtosh, të menaxhosh një punë a ekip.',
    example: 'Ai drejton departamentin e IT.',
    present: 'drejtoj, drejton, drejtojmë, drejtoni, drejtojnë',
    past: 'drejtova, drejtove, drejtoi, drejtuam, drejtuat, drejtuan',
    future: 'do të drejtoj',
    participle: 'drejtuar',
  },
  {
    borrowed_word: 'testoj',
    correct_albanian: 'provoj',
    definition: 'Të provosh diçka për të parë nëse funksionon.',
    example: 'Provova aplikacionin e ri.',
    present: 'provoj, provon, provojmë, provoni, provojnë',
    past: 'provova, provove, provoi, provuam, provuat, provuan',
    future: 'do të provoj',
    participle: 'provuar',
  },
  {
    borrowed_word: 'printoj',
    correct_albanian: 'shtyp',
    definition: 'Të shtypësh me makinë a me printer.',
    example: 'Shtypa dokumentin.',
    present: 'shtyp, shtyp, shtypim, shtypni, shtypin',
    past: 'shtypa, shtype, shtypi, shtypëm, shtypët, shtypën',
    future: 'do të shtyp',
    participle: 'shtypur',
  },
  {
    borrowed_word: 'edit',
    correct_albanian: 'redaktoj',
    definition: 'Të redaktosh, të ndryshosh një tekst a skedar.',
    example: 'Redaktova artikullin para publikimit.',
    present: 'redaktoj, redakton, redaktojmë, redaktoni, redaktojnë',
    past: 'redaktova, redaktove, redaktoi, redaktuam, redaktuat, redaktuan',
    future: 'do të redaktoj',
    participle: 'redaktuar',
  },
  {
    borrowed_word: 'klikoj',
    correct_albanian: 'shtyp',
    definition: 'Të shtypësh me miun (klikim) në një lidhje ose buton.',
    example: 'Shtypni këtu për të hapur faqen.',
    present: 'shtyp, shtyp, shtypim, shtypni, shtypin',
    past: 'shtypa, shtype, shtypi, shtypëm, shtypët, shtypën',
    future: 'do të shtyp',
    participle: 'shtypur',
  },
  {
    borrowed_word: 'share',
    correct_albanian: 'ndaj',
    definition: 'Të ndash me të tjerët, të shpërndash.',
    example: 'Ndajmë lajmin me miqtë.',
    present: 'ndaj, ndan, ndajmë, ndani, ndajnë',
    past: 'ndava, ndave, ndau, ndamë, ndatë, ndanë',
    future: 'do të ndaj',
    participle: 'ndarë',
  },
  {
    borrowed_word: 'like',
    correct_albanian: 'pëlqej',
    definition: 'Të pëlqejësh diçka, të shprehësh miratimin.',
    example: 'Më pëlqeu postimi.',
    present: 'pëlqej, pëlqen, pëlqejmë, pëlqeni, pëlqejnë',
    past: 'pëlqeva, pëlqeve, pëlqeu, pëlqyem, pëlqyet, pëlqyen',
    future: 'do të pëlqej',
    participle: 'pëlqyer',
  },
  {
    borrowed_word: 'follow',
    correct_albanian: 'ndjek',
    definition: 'Të ndjekësh dikë a diçka (p.sh. në rrjetet sociale).',
    example: 'E ndoqën mijëra përdorues.',
    present: 'ndjek, ndjek, ndjekim, ndiqni, ndjekin',
    past: 'ndoqa, ndoqe, ndoqi, ndoqëm, ndoqët, ndoqën',
    future: 'do të ndjek',
    participle: 'ndjekur',
  },
  {
    borrowed_word: 'blockoj',
    correct_albanian: 'pengoj',
    definition: 'Të pengosh, të bllokosh dikë a diçka.',
    example: 'E pengova përdoruesin e padëshiruar.',
    present: 'pengoj, pengon, pengojmë, pengoni, pengojnë',
    past: 'pengova, pengove, pengoi, penguam, penguat, penguan',
    future: 'do të pengoj',
    participle: 'penguar',
  },
  {
    borrowed_word: 'delete',
    correct_albanian: 'fshij',
    definition: 'Të fshish, të heqësh diçka.',
    example: 'Fshiva mesazhin gabim.',
    present: 'fshij, fshin, fshijmë, fshini, fshijnë',
    past: 'fshiva, fshive, fshiu, fshimë, fshitë, fshinë',
    future: 'do të fshij',
    participle: 'fshirë',
  },
  {
    borrowed_word: 'resetoj',
    correct_albanian: 'rivendos',
    definition: 'Të rivendosësh në gjendjen fillestare.',
    example: 'Rivendosa fjalëkalimin.',
    present: 'rivendos, rivendos, rivendosim, rivendosni, rivendosin',
    past: 'rivendosa, rivendose, rivendosi, rivendosëm, rivendosët, rivendosën',
    future: 'do të rivendos',
    participle: 'rivendosur',
  },
  {
    borrowed_word: 'save',
    correct_albanian: 'ruaj',
    definition: 'Të ruash diçka (p.sh. një skedar).',
    example: 'Ruaj dokumentin çdo pesë minuta.',
    present: 'ruaj, ruan, ruajmë, ruani, ruajnë',
    past: 'ruajta, ruajte, ruajti, ruajtëm, ruajtët, ruajtën',
    future: 'do të ruaj',
    participle: 'ruajtur',
  },
];

const CONJUGATION_TYPES = {
  present: 'E tashmja',
  past: 'E kryer',
  future: 'E ardhmja',
  participle: 'Pjesorja',
};

const seedExtraWords = async () => {
  const client = await pool.connect();
  try {
    const adminResult = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    const adminId = adminResult.rows[0]?.id;
    if (!adminId) {
      throw new Error('No admin user found. Run the main seed first: npm run seed');
    }

    let inserted = 0;
    let skipped = 0;

    for (const w of EXTRA_WORDS) {
      const wordResult = await client.query(
        `INSERT INTO words (borrowed_word, correct_albanian, category, is_verified, added_by)
         VALUES ($1, $2, 'Folje', true, $3)
         ON CONFLICT (borrowed_word) DO NOTHING
         RETURNING id`,
        [w.borrowed_word, w.correct_albanian, adminId]
      );

      if (wordResult.rows.length === 0) {
        skipped++;
        continue;
      }

      const wordId = wordResult.rows[0].id;

      await client.query(
        `INSERT INTO definitions (word_id, definition_text, example_sentence, definition_order)
         VALUES ($1, $2, $3, 1)`,
        [wordId, w.definition, w.example]
      );

      const conjugations = [
        [CONJUGATION_TYPES.present, w.present],
        [CONJUGATION_TYPES.past, w.past],
        [CONJUGATION_TYPES.future, w.future],
        [CONJUGATION_TYPES.participle, w.participle],
      ];
      for (const [ctype, ctext] of conjugations) {
        await client.query(
          `INSERT INTO conjugations (word_id, conjugation_type, conjugation_text)
           VALUES ($1, $2, $3)`,
          [wordId, ctype, ctext]
        );
      }
      inserted++;
    }

    console.log(`Extra words seed done: ${inserted} inserted, ${skipped} skipped (duplicates).`);
    return { inserted, skipped };
  } finally {
    client.release();
    await pool.end();
  }
};

seedExtraWords()
  .then(({ inserted, skipped }) => {
    console.log(`Total: ${inserted + skipped} processed.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
