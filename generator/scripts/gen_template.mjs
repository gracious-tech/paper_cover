
// Embed templates/cover.typ as a TypeScript string constant

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root = path.resolve(fileURLToPath(import.meta.url), '../..')
const typ_path = path.join(root, 'templates', 'cover.typ')
const out_path = path.join(root, 'src', 'template_content.ts')

const content = fs.readFileSync(typ_path, 'utf8')

const output = [
    '// Auto-generated from templates/cover.typ — do not edit directly',
    `export const COVER_TEMPLATE = ${JSON.stringify(content)}`,
    '',
].join('\n')

fs.writeFileSync(out_path, output, 'utf8')
console.log('Generated src/template_content.ts')
