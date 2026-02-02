// Script to migrate Supabase imports to API imports
// This script will be run manually to batch-replace imports

const fs = require('fs');
const path = require('path');

const filesToMigrate = [
    'src/views/Sedes.tsx',
    'src/views/Cameras.tsx',
    'src/views/Servers.tsx',
    'src/views/Inventory.tsx',
    'src/views/Maintenance.tsx',
    'src/views/Tickets.tsx',
    'src/views/Users.tsx',
    'src/views/Audit.tsx',
    'src/views/Sutran.tsx',
    'src/contexts/AuthContext.tsx',
    'src/components/ExcelImportModal.tsx',
    'src/components/VehicleImportModal.tsx'
];

const root = process.cwd();

filesToMigrate.forEach(file => {
    const filePath = path.join(root, file);

    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace import statement
        content = content.replace(
            /import\s+{[^}]*supabase[^}]*}\s+from\s+['"]\.\.\/lib\/supabase['"];?/g,
            "import { api } from '../lib/api';"
        );

        // Replace supabase.from() calls with api.from()
        content = content.replace(/supabase\.from\(/g, 'api.from(');

        fs.writeFileSync(filePath, content);
        console.log(`✅ Migrated: ${file}`);
    } else {
        console.log(`⚠️  Not found: ${file}`);
    }
});

console.log('\\n✨ Migration complete!');
