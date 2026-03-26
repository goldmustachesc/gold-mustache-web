#!/usr/bin/env node

/**
 * Theme validation script
 * Tests theme toggle functionality across the application
 */

import { launch } from "puppeteer";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = "./output/theme-validation";
const BASE_URL = "http://localhost:3001";

// Ensure output directory exists
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (_e) {
  // Directory might already exist
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  const path = join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot saved: ${path}`);
  return path;
}

async function testLoginPage() {
  console.log("\n🔍 Test 1: Login Page Theme Control");
  console.log("=".repeat(50));

  const browser = await launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/pt-BR/login`, {
      waitUntil: "networkidle0",
      timeout: 10000,
    });

    console.log("✓ Navegado para página de login");

    // Check for theme toggle
    await sleep(1000);
    await takeScreenshot(page, "01-login-initial");

    // Look for theme toggle container (radiogroup)
    const themeToggleContainer = await page.$(
      '[role="radiogroup"][aria-label*="Tema"], [role="radiogroup"][aria-label*="Theme"]',
    );

    if (!themeToggleContainer) {
      console.log("❌ FALHOU: Controle de tema não encontrado");
      const buttons = await page.$$("button");
      console.log(`   Encontrados ${buttons.length} botões na página`);
      return { passed: false, reason: "Controle de tema não encontrado" };
    }

    console.log("✓ Controle de tema (3 opções) encontrado");

    // Get initial theme from data-theme attribute and localStorage
    const getThemeInfo = () =>
      page.evaluate(() => {
        const html = document.documentElement;
        const isDark = html.classList.contains("dark");
        const isLight = html.classList.contains("light");
        const stored = localStorage.getItem("theme");
        return {
          classList: Array.from(html.classList),
          isDark,
          isLight,
          computed: isDark ? "dark" : isLight ? "light" : "unknown",
          localStorage: stored,
          dataTheme: html.getAttribute("data-theme"),
        };
      });

    const initialThemeInfo = await getThemeInfo();
    const initialTheme = initialThemeInfo.computed;
    console.log(`✓ Tema inicial: ${initialTheme}`);
    console.log(`   Classes: ${JSON.stringify(initialThemeInfo.classList)}`);
    console.log(`   localStorage: ${initialThemeInfo.localStorage}`);

    await takeScreenshot(page, `02-login-${initialTheme}-before`);

    // Find all theme option buttons and get their states
    const themeButtons = await themeToggleContainer.$$('button[role="radio"]');
    console.log(`✓ Encontrados ${themeButtons.length} botões de tema`);

    // Get which button is currently active
    const buttonStates = await Promise.all(
      themeButtons.map(async (btn, idx) => {
        const isChecked = await btn.evaluate(
          (el) => el.getAttribute("aria-checked") === "true",
        );
        const label = await btn.evaluate((el) => el.getAttribute("aria-label"));
        return { index: idx, isChecked, label };
      }),
    );

    console.log(`✓ Estados dos botões:`, JSON.stringify(buttonStates, null, 2));
    const activeButton = buttonStates.find((b) => b.isChecked);
    console.log(`✓ Botão ativo: ${activeButton?.label || "nenhum"}`);

    // Click the opposite theme button (if currently dark, click light; if light, click dark)
    const targetTheme = initialTheme === "dark" ? "light" : "dark";
    const targetButtonIndex = targetTheme === "light" ? 1 : 2; // 0=system, 1=light, 2=dark

    if (themeButtons[targetButtonIndex]) {
      console.log(`✓ Clicando no botão de tema: ${targetTheme}`);
      await themeButtons[targetButtonIndex].click();

      // Wait longer for theme to apply (next-themes needs time to hydrate and apply)
      await sleep(1500);

      const afterToggleInfo = await getThemeInfo();
      const afterToggleTheme = afterToggleInfo.computed;
      console.log(`✓ Tema após toggle: ${afterToggleTheme}`);
      console.log(`   Classes: ${JSON.stringify(afterToggleInfo.classList)}`);
      console.log(`   localStorage: ${afterToggleInfo.localStorage}`);

      await takeScreenshot(page, `03-login-${afterToggleTheme}-after`);

      if (initialTheme === afterToggleTheme) {
        console.log("❌ FALHOU: Tema não mudou após clicar no controle");
        return { passed: false, reason: "Tema não mudou visualmente" };
      }

      console.log(
        "✓ Tema mudou visualmente de",
        initialTheme,
        "para",
        afterToggleTheme,
      );
    } else {
      console.log("❌ FALHOU: Botão de tema alvo não encontrado");
      return { passed: false, reason: "Botão de tema não encontrado" };
    }

    // Test persistence - reload page
    console.log("🔄 Recarregando página para testar persistência...");
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(1000);

    const afterReloadInfo = await getThemeInfo();
    const afterReloadTheme = afterReloadInfo.computed;
    console.log(`✓ Tema após reload: ${afterReloadTheme}`);
    console.log(`   Classes: ${JSON.stringify(afterReloadInfo.classList)}`);
    console.log(`   localStorage: ${afterReloadInfo.localStorage}`);

    await takeScreenshot(page, `04-login-${afterReloadTheme}-after-reload`);

    if (afterReloadTheme !== afterToggleTheme) {
      console.log("❌ FALHOU: Tema não persistiu após reload");
      return { passed: false, reason: "Tema não persistiu após reload" };
    }

    console.log("✓ Tema persistiu após reload");

    return { passed: true, theme: afterReloadTheme };
  } catch (error) {
    console.error("❌ Erro:", error.message);
    return { passed: false, reason: error.message };
  } finally {
    await browser.close();
  }
}

async function testDashboard() {
  console.log("\n🔍 Test 2: Dashboard Theme Control");
  console.log("=".repeat(50));

  const browser = await launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/pt-BR/dashboard`, {
      waitUntil: "networkidle0",
      timeout: 10000,
    });

    console.log("✓ Navegado para dashboard");
    await sleep(1000);
    await takeScreenshot(page, "05-dashboard-initial");

    // Check if we got redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      console.log(
        "⚠️  BLOQUEADO: Redirecionado para login (autenticação necessária)",
      );
      return { passed: false, reason: "Requer autenticação", blocked: true };
    }

    // Look for sidebar/menu toggle
    const menuToggleSelectors = [
      'button[aria-label*="menu"]',
      'button[aria-label*="abrir"]',
      "[data-sidebar-toggle]",
      "[data-menu-toggle]",
    ];

    let menuToggle = null;
    for (const selector of menuToggleSelectors) {
      try {
        menuToggle = await page.$(selector);
        if (menuToggle) break;
      } catch (_e) {}
    }

    if (menuToggle) {
      console.log("✓ Abrindo menu/sidebar...");
      await menuToggle.click();
      await sleep(500);
      await takeScreenshot(page, "06-dashboard-menu-open");
    }

    // Look for theme toggle in dashboard
    const themeToggleContainer = await page.$(
      '[role="radiogroup"][aria-label*="Tema"], [role="radiogroup"][aria-label*="Theme"]',
    );

    if (!themeToggleContainer) {
      console.log(
        "❌ FALHOU: Nenhum controle de tema encontrado no dashboard/menu",
      );
      return {
        passed: false,
        reason: "Controle de tema não encontrado no dashboard",
      };
    }

    console.log("✓ Controle de tema encontrado no dashboard");

    const getThemeInfo = () =>
      page.evaluate(() => {
        const html = document.documentElement;
        const dataTheme =
          html.getAttribute("data-theme") || html.getAttribute("class") || "";
        const isDark =
          dataTheme.includes("dark") || html.classList.contains("dark");
        return {
          attribute: dataTheme,
          computed: isDark ? "dark" : "light",
          classes: html.className,
        };
      });

    const initialThemeInfo = await getThemeInfo();
    const initialTheme = initialThemeInfo.computed;
    console.log(`✓ Tema inicial do dashboard: ${initialTheme}`);
    console.log(`   Classes HTML: ${initialThemeInfo.classes}`);

    const themeButtons = await themeToggleContainer.$$('button[role="radio"]');
    const targetTheme = initialTheme === "dark" ? "light" : "dark";
    const targetButtonIndex = targetTheme === "light" ? 1 : 2;

    if (themeButtons[targetButtonIndex]) {
      await themeButtons[targetButtonIndex].click();
      await sleep(500);

      const afterToggleInfo = await getThemeInfo();
      const afterToggleTheme = afterToggleInfo.computed;
      console.log(`✓ Tema após toggle: ${afterToggleTheme}`);

      await takeScreenshot(
        page,
        `07-dashboard-${afterToggleTheme}-after-toggle`,
      );

      if (initialTheme === afterToggleTheme) {
        console.log("❌ FALHOU: Tema não mudou no dashboard");
        return { passed: false, reason: "Tema não mudou no dashboard" };
      }

      console.log(
        "✓ Tema mudou no dashboard de",
        initialTheme,
        "para",
        afterToggleTheme,
      );
      return { passed: true, theme: afterToggleTheme };
    } else {
      console.log("❌ FALHOU: Botão de tema não encontrado");
      return {
        passed: false,
        reason: "Botão de tema não encontrado no dashboard",
      };
    }
  } catch (error) {
    console.error("❌ Erro:", error.message);
    return { passed: false, reason: error.message };
  } finally {
    await browser.close();
  }
}

async function testConfigPage(currentTheme) {
  console.log("\n🔍 Test 3: Config Page Theme Respect");
  console.log("=".repeat(50));

  const browser = await launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/pt-BR/admin/barbearia/configuracoes`, {
      waitUntil: "networkidle0",
      timeout: 10000,
    });

    console.log("✓ Navegado para página de configurações");
    await sleep(1000);

    // Check if we got redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      console.log(
        "⚠️  BLOQUEADO: Redirecionado para login (autenticação necessária)",
      );
      return { passed: false, reason: "Requer autenticação", blocked: true };
    }

    const htmlClass = await page.evaluate(() => {
      const html = document.documentElement;
      const isDark =
        html.classList.contains("dark") ||
        (html.getAttribute("data-theme") || "").includes("dark");
      return {
        computed: isDark ? "dark" : "light",
        classes: html.className,
      };
    });
    const pageTheme = htmlClass.computed;

    await takeScreenshot(page, `08-config-page-${pageTheme}`);

    console.log(`✓ Tema da página de configurações: ${pageTheme}`);
    console.log(`   Classes: ${htmlClass.classes}`);
    console.log(`✓ Tema esperado: ${currentTheme}`);

    if (pageTheme === currentTheme) {
      console.log("✓ Página de configurações respeita o tema atual");
      return { passed: true, theme: pageTheme };
    } else {
      console.log("❌ FALHOU: Página não respeita o tema atual");
      return {
        passed: false,
        reason: "Tema não foi respeitado na página de config",
      };
    }
  } catch (error) {
    console.error("❌ Erro:", error.message);
    return { passed: false, reason: error.message };
  } finally {
    await browser.close();
  }
}

// Main execution
async function main() {
  console.log("🚀 Iniciando validação de tema\n");

  const results = {
    loginPage: null,
    dashboard: null,
    configPage: null,
  };

  try {
    // Test 1: Login page
    results.loginPage = await testLoginPage();

    // Test 2: Dashboard (if accessible)
    results.dashboard = await testDashboard();

    // Test 3: Config page (if accessible and we know the current theme)
    if (results.dashboard.theme) {
      results.configPage = await testConfigPage(results.dashboard.theme);
    } else if (results.loginPage.theme) {
      results.configPage = await testConfigPage(results.loginPage.theme);
    }
  } catch (error) {
    console.error("Erro fatal:", error);
  }

  // Print summary report
  console.log("\n\n📊 RELATÓRIO FINAL");
  console.log("=".repeat(60));

  console.log("\n1) PÁGINA DE LOGIN:");
  console.log(
    "   - Controle de tema visível:",
    results.loginPage?.passed ? "✓ PASSOU" : "✗ FALHOU",
  );
  console.log(
    "   - Alternância light/dark:",
    results.loginPage?.passed ? "✓ PASSOU" : "✗ FALHOU",
  );
  console.log(
    "   - Persistência após reload:",
    results.loginPage?.passed ? "✓ PASSOU" : "✗ FALHOU",
  );
  if (!results.loginPage?.passed) {
    console.log("   - Motivo:", results.loginPage?.reason);
  }

  console.log("\n2) DASHBOARD:");
  if (results.dashboard?.blocked) {
    console.log("   ⚠️  BLOQUEADO: Requer autenticação");
  } else {
    console.log(
      "   - Controle de tema no menu:",
      results.dashboard?.passed ? "✓ PASSOU" : "✗ FALHOU",
    );
    console.log(
      "   - Troca de tema funciona:",
      results.dashboard?.passed ? "✓ PASSOU" : "✗ FALHOU",
    );
    if (!results.dashboard?.passed) {
      console.log("   - Motivo:", results.dashboard?.reason);
    }
  }

  console.log("\n3) PÁGINA DE CONFIGURAÇÕES:");
  if (results.configPage?.blocked) {
    console.log("   ⚠️  BLOQUEADO: Requer autenticação");
  } else if (!results.configPage) {
    console.log("   ⚠️  NÃO TESTADO: Tema atual desconhecido");
  } else {
    console.log(
      "   - Respeita tema atual:",
      results.configPage?.passed ? "✓ PASSOU" : "✗ FALHOU",
    );
    if (!results.configPage?.passed) {
      console.log("   - Motivo:", results.configPage?.reason);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`\n📁 Screenshots salvos em: ${OUTPUT_DIR}`);

  // Write JSON report
  const reportPath = join(OUTPUT_DIR, "report.json");
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Relatório JSON: ${reportPath}\n`);
}

main().catch(console.error);
