#!/usr/bin/env node

/**
 * Script de otimização de imagens
 * Converte imagens para WebP e gera versões otimizadas
 *
 * Uso: node scripts/optimize-images.cjs
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const IMAGE_DIRS = [
  "images/gallery",
  "images/ig",
  "images/interno",
  "images/sponsors",
  "images/services",
  "barbers",
];

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

function checkSharpInstalled() {
  try {
    require.resolve("sharp");
    return true;
  } catch {
    console.log("📦 Sharp não encontrado. Instalando...");
    try {
      execSync("npm install --save-dev sharp", { stdio: "inherit" });
      return true;
    } catch (error) {
      console.error("❌ Erro ao instalar sharp:", error.message);
      return false;
    }
  }
}

async function optimizeImages() {
  if (!checkSharpInstalled()) {
    console.error("❌ Não foi possível instalar sharp. Abortando.");
    process.exit(1);
  }

  const sharp = require("sharp");

  let totalProcessed = 0;
  let totalSaved = 0;

  console.log("🖼️  Iniciando otimização de imagens...\n");

  for (const dir of IMAGE_DIRS) {
    const dirPath = path.join(PUBLIC_DIR, dir);

    if (!fs.existsSync(dirPath)) {
      console.log(`⚠️  Diretório não encontrado: ${dir}`);
      continue;
    }

    console.log(`📁 Processando: ${dir}`);
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();

      if (!IMAGE_EXTENSIONS.includes(ext)) {
        continue;
      }

      const filePath = path.join(dirPath, file);
      const fileStats = fs.statSync(filePath);
      const originalSize = fileStats.size;

      try {
        // Gerar versão WebP
        const webpPath = filePath.replace(ext, ".webp");

        await sharp(filePath).webp({ quality: 85, effort: 6 }).toFile(webpPath);

        const webpStats = fs.statSync(webpPath);
        const savedBytes = originalSize - webpStats.size;
        const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

        console.log(`  ✅ ${file} → ${path.basename(webpPath)}`);
        console.log(
          `     Original: ${(originalSize / 1024).toFixed(1)}KB → WebP: ${(webpStats.size / 1024).toFixed(1)}KB (${savedPercent}% menor)`,
        );

        totalProcessed++;
        totalSaved += savedBytes;
      } catch (error) {
        console.error(`  ❌ Erro ao processar ${file}:`, error.message);
      }
    }
    console.log("");
  }

  console.log("✨ Otimização concluída!");
  console.log(`📊 Total de imagens processadas: ${totalProcessed}`);
  console.log(
    `💾 Espaço economizado: ${(totalSaved / 1024 / 1024).toFixed(2)}MB`,
  );
}

optimizeImages().catch(console.error);
