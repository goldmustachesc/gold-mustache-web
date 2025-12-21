/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // Nova funcionalidade
        "fix", // Correção de bug
        "docs", // Documentação
        "style", // Formatação (sem mudança de código)
        "refactor", // Refatoração
        "perf", // Melhoria de performance
        "test", // Testes
        "build", // Sistema de build
        "ci", // CI/CD
        "chore", // Manutenção
        "revert", // Reversão de commit
      ],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "subject-full-stop": [2, "never", "."],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 100],
  },
};
