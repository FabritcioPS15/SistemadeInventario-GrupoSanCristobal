const fs = require('fs');
const path = require('path');
const dir = 'src/views';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => path.join(dir, f));

let successCount = 0;

files.forEach(file => {
    let text = fs.readFileSync(file, 'utf8');
    const rx = /\s*\{\/\*\s*Integrated Search Bar(?: in Header)?\s*\*\/\}\s*<div className="flex-1 max-w-md px-4">\s*<div className="relative group">\s*<Search[^>]*>\s*<input[\s\S]*?<\/div>\s*<\/div>/g;

    const newText = text.replace(rx, '');

    if (newText !== text) {
        fs.writeFileSync(file, newText);
        successCount++;
        console.log(`Updated ${file}`);
    }
});

const rx2 = /\s*\{\/\*\s*Integrated Search Bar\s*\*\/\}\s*<div className="flex-1 max-w-[200px] lg:max-w-md px-4">\s*<div className="relative group">\s*<Search[^>]*>\s*<input[\s\S]*?<\/div>\s*<\/div>/g;

files.forEach(file => {
    let text = fs.readFileSync(file, 'utf8');

    const newText = text.replace(rx2, '');

    if (newText !== text) {
        fs.writeFileSync(file, newText);
        successCount++;
        console.log(`Updated ${file}`);
    }
});

const ticketsFile = 'src/views/Tickets.tsx';
let ticketsText = fs.readFileSync(ticketsFile, 'utf8');
const rxTickets = /\s*\{\/\*\s*Search\s*\*\/\}\s*<div className="flex-1 max-w-md px-4">\s*<div className="relative group">\s*<Search[\s\S]*?<\/div>\s*<\/div>/g;
let newTicketsText = ticketsText.replace(rxTickets, '');
if (newTicketsText !== ticketsText) {
    fs.writeFileSync(ticketsFile, newTicketsText);
    successCount++;
    console.log(`Updated ${ticketsFile}`);
}

console.log(`Total replaced: ${successCount}`);
