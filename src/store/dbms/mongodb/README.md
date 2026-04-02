# MongoDB Seed Data

## Collection Naming Convention

All collection names use **camelCase**:
- `tasks`
- `contacts`
- `content`
- `inventory`
- `projects`
- `products`

## Seed File Format

Each `.seed.json` file is a JSON array of documents suitable for `mongoimport`:

```json
[
  { "_id": "t1", "title": "...", ... },
  ...
]
```

## Seeding via Makefile

From the project root:

```bash
# Start MongoDB container
make db-up

# Seed all collections
make seed-mongo

# Verify:
make mongo-shell
> db.tasks.countDocuments()
> db.products.countDocuments()
```

## Manual Seeding

```bash
docker exec -i notion_mongodb mongoimport \
  --username=notion_user --password=notion_pass --authenticationDatabase=admin \
  --db=notion_db --collection=tasks --jsonArray --drop \
  < src/store/dbms/mongodb/tasks.seed.json
```

Repeat for each collection file.

## Document Schema

Documents use `_id` as the primary key (matching the `id` field from other formats).
Dates are stored as ISO 8601 strings. Arrays are native BSON arrays.
