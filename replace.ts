import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/orange-/g, 'teal-');
    content = content.replace(/text-orange/g, 'text-teal');
    content = content.replace(/bg-orange/g, 'bg-teal');
    content = content.replace(/ring-orange/g, 'ring-teal');
    content = content.replace(/shadow-orange/g, 'shadow-teal');
    content = content.replace(/border-orange/g, 'border-teal');
    content = content.replace(/focus:ring-orange/g, 'focus:ring-teal');
    content = content.replace(/focus:border-orange/g, 'focus:border-teal');
    content = content.replace(/orange /g, 'teal ');
    // Handle the specific cases
    content = content.replace(/text-emerald-/g, 'text-teal-'); 
    content = content.replace(/bg-stone-/g, 'bg-slate-'); 
    content = content.replace(/text-stone-/g, 'text-slate-');
    content = content.replace(/border-stone-/g, 'border-slate-');
    content = content.replace(/shadow-stone-/g, 'shadow-slate-');
    content = content.replace(/ring-stone-/g, 'ring-slate-');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced in ${filePath}`);
}

const files = [
    'App.tsx',
    'index.html',
    'components/LoginScreen.tsx',
    'components/PatientMode.tsx',
    'components/CaregiverMode.tsx'
];

files.forEach(replaceInFile);
