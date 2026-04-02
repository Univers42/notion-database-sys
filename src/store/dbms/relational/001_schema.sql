-- 001_schema.sql — PostgreSQL schema for DBMS seed data
-- Run via: psql -U notion_user -d notion_db -f 001_schema.sql

BEGIN;

-- ── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
    id              VARCHAR(36) PRIMARY KEY,
    title           TEXT NOT NULL,
    status          VARCHAR(50),
    priority        VARCHAR(50),
    tags            TEXT[],
    assignee        VARCHAR(100),
    due_date        TIMESTAMPTZ,
    completed       BOOLEAN DEFAULT FALSE,
    story_points    INTEGER,
    icon            VARCHAR(10),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(100),
    last_edited_by  VARCHAR(100)
);

-- ── Contacts (CRM) ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id              VARCHAR(36) PRIMARY KEY,
    name            TEXT NOT NULL,
    company         VARCHAR(200),
    stage           VARCHAR(50),
    deal_value      NUMERIC(12, 2),
    email           VARCHAR(200),
    phone           VARCHAR(50),
    last_contact    TIMESTAMPTZ,
    vip             BOOLEAN DEFAULT FALSE,
    source          VARCHAR(100),
    icon            VARCHAR(10),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(100),
    last_edited_by  VARCHAR(100)
);

-- ── Content Calendar ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content (
    id              VARCHAR(36) PRIMARY KEY,
    title           TEXT NOT NULL,
    platforms       TEXT[],
    status          VARCHAR(50),
    publish_date    TIMESTAMPTZ,
    author          VARCHAR(100),
    approved        BOOLEAN DEFAULT FALSE,
    url             TEXT,
    icon            VARCHAR(10),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(100),
    last_edited_by  VARCHAR(100)
);

-- ── Inventory ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
    id              VARCHAR(36) PRIMARY KEY,
    name            TEXT NOT NULL,
    category        VARCHAR(100),
    serial_number   VARCHAR(100),
    price           NUMERIC(12, 2),
    purchase_date   TIMESTAMPTZ,
    in_service      BOOLEAN DEFAULT TRUE,
    location        TEXT,
    icon            VARCHAR(10),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(100),
    last_edited_by  VARCHAR(100)
);

-- ── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id              VARCHAR(36) PRIMARY KEY,
    title           TEXT NOT NULL,
    status          VARCHAR(50),
    priority        VARCHAR(50),
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    budget          NUMERIC(12, 2),
    lead            VARCHAR(100),
    icon            VARCHAR(10),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      VARCHAR(100),
    last_edited_by  VARCHAR(100)
);

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id                VARCHAR(36) PRIMARY KEY,
    name              TEXT NOT NULL,
    description       TEXT,
    price             NUMERIC(12, 2),
    cost              NUMERIC(12, 2),
    weight_kg         NUMERIC(8, 2),
    category          VARCHAR(100),
    condition         VARCHAR(50),
    rating            VARCHAR(20),
    shipping          VARCHAR(50),
    tags              TEXT[],
    brand_tier        TEXT[],
    stock_status      VARCHAR(50),
    release_date      TIMESTAMPTZ,
    warranty_expires  TIMESTAMPTZ,
    featured          BOOLEAN DEFAULT FALSE,
    returnable        BOOLEAN DEFAULT TRUE,
    manager           VARCHAR(100),
    reviewer          VARCHAR(100),
    product_url       TEXT,
    manual_url        TEXT,
    vendor_email      VARCHAR(200),
    vendor_phone      VARCHAR(50),
    warehouse         TEXT,
    origin_country    TEXT,
    sku               VARCHAR(50),
    stock_qty         INTEGER DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    created_by        VARCHAR(100),
    last_edited_by    VARCHAR(100)
);

COMMIT;
