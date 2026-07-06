const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync('src', []);

let filesUpdated = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  const regex = /new Date\(([^)]+)\)\.toLocaleDateString\(([^)]*)\)/g;
  
  content = content.replace(regex, (match, expr, args) => {
    if (expr.includes('includes') || expr.includes('T12:00:00') || expr === '') {
      return match;
    }
    return `new Date(String(${expr}).includes('T') ? String(${expr}) : \`\${${expr}}T12:00:00\`).toLocaleDateString(${args})`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    filesUpdated++;
  }
});

console.log(`Total files updated: ${filesUpdated}`);
