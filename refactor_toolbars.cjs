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

const files = walkSync('src/modules', []);
let updated = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Check if it has a search input and flex-wrap items-center gap-2
  if (content.includes('group/search') && content.includes('flex-wrap items-center gap-2') && !content.includes('ActionToolbar')) {
    
    // 1. Add import ActionToolbar
    if (content.includes("import ActionToolbar")) return;
    
    // Find the right place to add the import (after the last import)
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.substring(0, endOfLine + 1) + 
                "import ActionToolbar from '../../../shared/components/ui/ActionToolbar';\n" + 
                content.substring(endOfLine + 1);
    }
    
    // Use regex to replace the wrapper div with ActionToolbar
    // We need to carefully parse the JSX, this is tricky with regex.
    // We will do a manual replace using multi_replace_file_content for precision if this fails, 
    // but let's try a simple heuristic for now.
    
    // Look for:
    // <div className="... flex flex-col md:flex-row ...">
    //   <div className="absolute -top-3 -left-3">...</div> (optional)
    //   <div className="flex-1 relative group/search">
    //     ...
    //   </div>
    //   <div className="flex flex-wrap items-center gap-2">
    //     ...
    //   </div>
    // </div>
  }
});
