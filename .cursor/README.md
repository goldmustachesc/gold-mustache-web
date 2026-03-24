# Configuração Cursor

## MCP

O arquivo versionado [mcp.json](mcp.json) contém apenas servidores MCP seguros para compartilhar no repositório.

Credenciais e servidores que exigem segredos (por exemplo Upstash, APIs com chave) devem ser configurados em `~/.cursor/mcp.json` na sua máquina, não commitados. O Cursor mescla o arquivo do projeto com o global; o do projeto tem precedência quando há conflito de nome.

Documentação: [MCP integrations](https://cursor.com/help/customization/mcp).
