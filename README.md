# generator-api

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Database

```sql
CREATE SCHEMA content IF NOT EXISTS
```

## Migrations

```bash
$ npm run build

# generate a new migration
$ npm run typeorm migration:generate -- -d src/app-data-source.ts src/migrations/<your-name>

$ npm run build

# run all migrations
$ npm run migration:run
```

#### Prettier configuration

Webstorm IDE settings - Prettier - Manual Prettier configuration - Prettier package (`\node_modules\prettier`)

Check mark 'Run on save'
