import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

async function loadPostcssConfig(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);

  try {
    const moduleUrl = new URL(
      `?nodeEnv=${nodeEnv}-${Date.now()}`,
      pathToFileURL(join(process.cwd(), "postcss.config.mjs")),
    );
    const module = await import(moduleUrl.href);
    return module.default;
  } finally {
    vi.unstubAllEnvs();
  }
}

describe("postcss config", () => {
  it("keeps Tailwind CSS optimization enabled in test", async () => {
    const postcssConfig = await loadPostcssConfig("test");

    expect(postcssConfig).toMatchObject({
      plugins: {
        "@tailwindcss/postcss": {
          optimize: {
            minify: false,
          },
        },
      },
    });
  });

  it("keeps Tailwind CSS optimization enabled in production", async () => {
    const postcssConfig = await loadPostcssConfig("production");

    expect(postcssConfig).toMatchObject({
      plugins: {
        "@tailwindcss/postcss": {
          optimize: true,
        },
      },
    });
  });
});
