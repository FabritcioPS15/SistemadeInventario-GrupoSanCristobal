#!/usr/bin/env node

/**
 * Script de verificación pre-deployment para Vercel
 * Verifica que todo esté configurado correctamente antes de desplegar
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verificando configuración para Vercel...\n');

let hasErrors = false;
let hasWarnings = false;

// 1. Verificar que vercel.json existe
console.log('1️⃣ Verificando vercel.json...');
const vercelJsonPath = join(__dirname, 'vercel.json');
if (!existsSync(vercelJsonPath)) {
    console.error('   ❌ ERROR: vercel.json no encontrado');
    hasErrors = true;
} else {
    try {
        const vercelConfig = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
        if (!vercelConfig.rewrites || vercelConfig.rewrites.length === 0) {
            console.error('   ❌ ERROR: vercel.json no tiene configuración de rewrites');
            hasErrors = true;
        } else {
            console.log('   ✅ vercel.json configurado correctamente');
        }
    } catch (error) {
        console.error('   ❌ ERROR: vercel.json tiene formato JSON inválido');
        hasErrors = true;
    }
}

// 2. Verificar package.json
console.log('\n2️⃣ Verificando package.json...');
const packageJsonPath = join(__dirname, 'package.json');
if (!existsSync(packageJsonPath)) {
    console.error('   ❌ ERROR: package.json no encontrado');
    hasErrors = true;
} else {
    try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

        if (!packageJson.scripts || !packageJson.scripts.build) {
            console.error('   ❌ ERROR: No existe el script "build" en package.json');
            hasErrors = true;
        } else if (packageJson.scripts.build !== 'vite build') {
            console.warn('   ⚠️  ADVERTENCIA: El script build no es "vite build"');
            hasWarnings = true;
        } else {
            console.log('   ✅ Script de build configurado correctamente');
        }

        // Verificar dependencias críticas
        const criticalDeps = ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'vite'];
        const missingDeps = criticalDeps.filter(dep =>
            !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
        );

        if (missingDeps.length > 0) {
            console.error(`   ❌ ERROR: Dependencias faltantes: ${missingDeps.join(', ')}`);
            hasErrors = true;
        } else {
            console.log('   ✅ Todas las dependencias críticas presentes');
        }
    } catch (error) {
        console.error('   ❌ ERROR: package.json tiene formato JSON inválido');
        hasErrors = true;
    }
}

// 3. Verificar index.html
console.log('\n3️⃣ Verificando index.html...');
const indexHtmlPath = join(__dirname, 'index.html');
if (!existsSync(indexHtmlPath)) {
    console.error('   ❌ ERROR: index.html no encontrado');
    hasErrors = true;
} else {
    const indexHtml = readFileSync(indexHtmlPath, 'utf-8');
    if (!indexHtml.includes('<div id="root">')) {
        console.error('   ❌ ERROR: index.html no contiene <div id="root">');
        hasErrors = true;
    } else if (!indexHtml.includes('/src/main.tsx')) {
        console.error('   ❌ ERROR: index.html no importa /src/main.tsx');
        hasErrors = true;
    } else {
        console.log('   ✅ index.html configurado correctamente');
    }
}

// 4. Verificar vite.config.ts
console.log('\n4️⃣ Verificando vite.config.ts...');
const viteConfigPath = join(__dirname, 'vite.config.ts');
if (!existsSync(viteConfigPath)) {
    console.error('   ❌ ERROR: vite.config.ts no encontrado');
    hasErrors = true;
} else {
    console.log('   ✅ vite.config.ts encontrado');
}

// 5. Verificar estructura de src
console.log('\n5️⃣ Verificando estructura de src...');
const requiredFiles = [
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'src/lib/supabase.ts'
];

const missingFiles = requiredFiles.filter(file => !existsSync(join(__dirname, file)));
if (missingFiles.length > 0) {
    console.error(`   ❌ ERROR: Archivos faltantes: ${missingFiles.join(', ')}`);
    hasErrors = true;
} else {
    console.log('   ✅ Todos los archivos críticos presentes');
}

// 6. Verificar .gitignore
console.log('\n6️⃣ Verificando .gitignore...');
const gitignorePath = join(__dirname, '.gitignore');
if (!existsSync(gitignorePath)) {
    console.warn('   ⚠️  ADVERTENCIA: .gitignore no encontrado');
    hasWarnings = true;
} else {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.env')) {
        console.warn('   ⚠️  ADVERTENCIA: .gitignore no incluye .env');
        hasWarnings = true;
    } else if (!gitignore.includes('node_modules')) {
        console.warn('   ⚠️  ADVERTENCIA: .gitignore no incluye node_modules');
        hasWarnings = true;
    } else {
        console.log('   ✅ .gitignore configurado correctamente');
    }
}

// Resumen final
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIÓN\n');

if (hasErrors) {
    console.error('❌ Se encontraron ERRORES CRÍTICOS que deben corregirse antes de desplegar.');
    console.log('\n⚠️  Por favor, corrige los errores listados arriba antes de continuar.');
    process.exit(1);
} else if (hasWarnings) {
    console.warn('⚠️  Se encontraron advertencias, pero el proyecto puede desplegarse.');
    console.log('✅ Configuración básica correcta.');
    console.log('\n📝 Recuerda configurar las variables de entorno en Vercel:');
    console.log('   - VITE_SUPABASE_URL');
    console.log('   - VITE_SUPABASE_ANON_KEY');
    process.exit(0);
} else {
    console.log('✅ ¡Todo está configurado correctamente!');
    console.log('\n📝 Recuerda configurar las variables de entorno en Vercel:');
    console.log('   - VITE_SUPABASE_URL');
    console.log('   - VITE_SUPABASE_ANON_KEY');
    console.log('\n🚀 Listo para desplegar en Vercel!');
    process.exit(0);
}
