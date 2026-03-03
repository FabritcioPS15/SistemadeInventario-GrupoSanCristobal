const fs = require('fs');
const files = [
    'Users', 'Sutran', 'SpareParts', 'Servers', 'Sedes', 'Painpoints',
    'MTCAccesos', 'Maintenance', 'Inventory', 'Enviados', 'Cameras', 'Audit', 'Tickets'
];

let updatedCount = 0;

files.forEach(f => {
    const p = 'src/views/' + f + '.tsx';
    if (!fs.existsSync(p)) return;

    let text = fs.readFileSync(p, 'utf8');

    // The structure to remove:
    // {/* Integrated Search Bar ... */}
    // <div className="flex-1 ...">
    //   <div className="relative group">
    //     <Search ... />
    //     <input ... />
    //   </div>
    // </div>

    // This regex matches that specific structure
    const regex = /\{\/\* Integrated Search Bar.*?\*\/\}\s*<div[^>]*max-w-md[^>]*>\s*<div[^>]*relative group[^>]*>\s*<Search[^>]*>\s*<input[^>]*>\s*<\/div>\s*<\/div>/g;

    let newText = text.replace(regex, '');

    // Alternative for tickets:
    const regexTickets = /\{\/\* Search \*\/\}\s*<div[^>]*max-w-md[^>]*>\s*<div[^>]*relative group[^>]*>\s*<Search[^>]*>\s*<input[^>]*>\s*<\/div>\s*<\/div>/g;
    newText = newText.replace(regexTickets, '');

    if (newText !== text) {
        fs.writeFileSync(p, newText);
        console.log('Updated ' + f);
        updatedCount++;
    }
});

console.log('Total files updated: ' + updatedCount);
