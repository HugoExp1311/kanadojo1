const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../grammar_level');
const destDir = path.resolve(__dirname, '../src/data');
const destFile = path.join(destDir, 'grammar.json');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const result = {};
['1', '2', '3', '4', '5'].forEach(levelNum => {
  const levelStr = `n${levelNum}`;
  const file = path.join(srcDir, `${levelStr}.json`);
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    result[levelStr] = data.grammar;
  }
});

fs.writeFileSync(destFile, JSON.stringify(result, null, 2));
console.log('Successfully created', destFile);
