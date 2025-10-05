// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';


function stripJsComments(code) {
  
  code = code.replace(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*')|\/\*[\s\S]*?\*\/|\/\/.*$/gm, (match, string) => {
    return string || ''; // Keep strings, remove comments
  });
  return code;
}

// Custom comment stripper for CSS
function stripCssComments(code) {
  // Remove CSS block comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments if any (rare in CSS)
  code = code.replace(/\/\/.*$/gm, '');
  return code;
}

function processDirectory(dir) {
  const items = fs.readdirSync(dir, {withFileTypes: true});
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === '.next') continue;
      processDirectory(fullPath);
    } else {
      const ext = path.extname(fullPath);
      if (['.ts', '.tsx', '.js', '.css', '.d.ts'].includes(ext)) {
        let content;
        try {
          content = fs.readFileSync(fullPath, 'utf8');
        } catch (err) {
          console.error(`Error reading ${fullPath}:`, err);
          continue;
        }
        let stripped;
        if (ext === '.css') {
          stripped = stripCssComments(content);
        } else {
          stripped = stripJsComments(content);
        }
        if (stripped !== content) {
          try {
            fs.writeFileSync(fullPath, stripped);
            console.log(`Stripped comments from ${fullPath}`);
          } catch (err) {
            console.error(`Error writing ${fullPath}:`, err);
          }
        }
      }
    }
  }
}

// Run on project root
processDirectory(process.cwd());
console.log('Comment stripping completed for the project.');
