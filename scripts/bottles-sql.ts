// Prints an idempotent SQL upsert for the catalog. Usage: npm run bottles:sql > out.sql
import { readFileSync } from 'node:fs'
import { bottlesToSql } from '../src/data/bottleSql'
import { parseBottles } from '../src/data/bottles'

try {
  console.log(bottlesToSql(parseBottles(JSON.parse(readFileSync('src/data/bottles.json', 'utf8')))))
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}
