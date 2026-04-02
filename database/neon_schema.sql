-- Neon PostgreSQL schema for Coding with Cats
-- Run this once in the Neon SQL editor after creating your project.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Students (includes role for auth)
CREATE TABLE IF NOT EXISTS students (
    student_id  TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'User',
    avatarUrl   TEXT,
    totalPoints INT NOT NULL DEFAULT 0,
    createdAt   TIMESTAMP NOT NULL DEFAULT NOW(),
    lastLogin   TIMESTAMP
);

-- Stages (levels 1–15)
CREATE TABLE IF NOT EXISTS stages (
    stage_id    TEXT PRIMARY KEY,
    name        TEXT,
    difficulty  TEXT,
    description TEXT,
    maxScore    INT,
    isActive    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed stages 1–15
INSERT INTO stages (stage_id, name, difficulty, description, maxScore) VALUES
    ('1',  'Printing Text',         'Beginner',     'Learn to print output in Python',              100),
    ('2',  'Python Variables',      'Beginner',     'Understand variables and assignment',           100),
    ('3',  'Data Types',            'Beginner',     'Explore strings, ints, floats, booleans',      100),
    ('4',  'Input Functions',       'Beginner',     'Read user input with input()',                  100),
    ('5',  'Boss: Code Cat',        'Boss',         'World 1 boss fight — defeat the Code Cat!',    100),
    ('6',  'Conditional Statements','Intermediate', 'if/elif/else logic',                           100),
    ('7',  'While Loops',           'Intermediate', 'Repeat actions with while loops',              100),
    ('8',  'For Loops',             'Intermediate', 'Iterate with for loops and range()',           100),
    ('9',  'Lists and Tuples',      'Advanced',     'Work with ordered collections',                100),
    ('10', 'Boss: Logic Master',    'Boss',         'World 2 boss fight — defeat the Logic Master!',100),
    ('11', 'Dictionaries & Sets',   'Advanced',     'Key-value pairs and unique collections',       100),
    ('12', 'Functions',             'Advanced',     'Define and call reusable functions',           100),
    ('13', 'Classes & Objects',     'Advanced',     'Object-oriented programming basics',           100),
    ('14', 'Inheritance',           'Advanced',     'Extend classes with inheritance',              100),
    ('15', 'Boss: Ultimate',        'Boss',         'Final boss — the Ultimate Challenger!',        100)
ON CONFLICT (stage_id) DO NOTHING;

-- Leaderboards (extended with scoring columns)
CREATE TABLE IF NOT EXISTS leaderboards (
    leaderboard_id    TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    student_id        TEXT REFERENCES students(student_id),
    stage_id          TEXT REFERENCES stages(stage_id),
    base_score        INT NOT NULL DEFAULT 0,
    time_bonus        INT NOT NULL DEFAULT 0,
    final_score       INT NOT NULL DEFAULT 0,
    completion_time_ms INT NOT NULL DEFAULT 0,
    bonus_applied     BOOLEAN NOT NULL DEFAULT FALSE,
    rank              INT,
    recordedAt        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Items (shop)
CREATE TABLE IF NOT EXISTS items (
    item_id     TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name        TEXT,
    type        TEXT,
    price       INT,
    description TEXT,
    stockQty    INT
);

-- Seed a few sample shop items
INSERT INTO items (item_id, name, type, price, description) VALUES
    ('item-1', 'Cat Hat',       'cosmetic', 50,  'A stylish hat for your cat'),
    ('item-2', 'Rainbow Trail', 'cosmetic', 100, 'Leave a rainbow trail as you move'),
    ('item-3', 'Gold Border',   'cosmetic', 200, 'Gold border around your profile')
ON CONFLICT (item_id) DO NOTHING;

-- Student items (purchases)
CREATE TABLE IF NOT EXISTS student_items (
    student_id  TEXT REFERENCES students(student_id),
    item_id     TEXT REFERENCES items(item_id),
    purchasedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    quantity    INT NOT NULL DEFAULT 1,
    PRIMARY KEY (student_id, item_id)
);

-- Student stages (progress tracking)
CREATE TABLE IF NOT EXISTS student_stages (
    student_id  TEXT REFERENCES students(student_id),
    stage_id    TEXT REFERENCES stages(stage_id),
    status      TEXT,
    score       INT,
    completedAt TIMESTAMP,
    attempts    INT NOT NULL DEFAULT 0,
    PRIMARY KEY (student_id, stage_id)
);
