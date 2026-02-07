CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS words (
    id SERIAL PRIMARY KEY,
    borrowed_word VARCHAR(255) UNIQUE NOT NULL,
    correct_albanian VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    difficulty_level VARCHAR(50),
    usage_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    added_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borrowed_word ON words(borrowed_word);
CREATE INDEX IF NOT EXISTS idx_correct_albanian ON words(correct_albanian);
CREATE INDEX IF NOT EXISTS idx_borrowed_word_trgm ON words USING gin (borrowed_word gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_correct_albanian_trgm ON words USING gin (correct_albanian gin_trgm_ops);

CREATE TABLE IF NOT EXISTS definitions (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    definition_text TEXT NOT NULL,
    example_sentence TEXT,
    definition_order INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conjugations (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    conjugation_type VARCHAR(100) NOT NULL,
    conjugation_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS word_suggestions (
    id SERIAL PRIMARY KEY,
    borrowed_word VARCHAR(255) NOT NULL,
    suggested_albanian VARCHAR(255),
    suggested_definition TEXT,
    submitter_name VARCHAR(255),
    submitter_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS word_of_the_day (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id),
    display_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_display_date ON word_of_the_day(display_date);

CREATE TABLE IF NOT EXISTS search_logs (
    id SERIAL PRIMARY KEY,
    search_term VARCHAR(255) NOT NULL,
    found BOOLEAN DEFAULT false,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_term ON search_logs(search_term);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id),
    question_text TEXT NOT NULL,
    correct_answer VARCHAR(255) NOT NULL,
    wrong_answer_1 VARCHAR(255) NOT NULL,
    wrong_answer_2 VARCHAR(255),
    wrong_answer_3 VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
