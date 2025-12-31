import { MarkdownParser } from './src/lib/markdown-parser';
import * as fs from 'fs';

console.log('=== Testing MarkdownParser ===\n');

const mdPath = './src/skills/scheduling/schedule-appointment.skill.md';
console.log('1. Reading file:', mdPath);
const content = fs.readFileSync(mdPath, 'utf-8');
console.log('File content (first 500 chars):');
console.log(content.substring(0, 500));
console.log('\n');

console.log('2. Parsing with MarkdownParser:');
const parsed = MarkdownParser.parseSkillMarkdown(mdPath);

console.log('\n3. Results:');
console.log('Metadata:', JSON.stringify(parsed.metadata, null, 2));
console.log('\n');
console.log('verificationMessage value:', parsed.metadata.verificationMessage);
console.log('verificationMessage type:', typeof parsed.metadata.verificationMessage);
console.log('');

if (parsed.metadata.verificationMessage) {
  console.log('✅✅✅ SUCCESS! verificationMessage was extracted!');
} else {
  console.log('❌❌❌ FAILED! verificationMessage is undefined');
}
