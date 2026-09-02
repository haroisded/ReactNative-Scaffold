# Adding the ScrapeGraphAI MCP server

Registered at **user scope**, so it is available in every project rather than only this
scaffold. The config in `~/.claude.json` stores a placeholder, never the key itself:

```json
"sgai": {
  "type": "http",
  "url": "https://mcp.scrapegraphai.com/mcp",
  "headers": { "Authorization": "Bearer ${SGAI_API_KEY}" }
}
```

The command that produced it:

```powershell
claude mcp add --transport http sgai --scope user https://mcp.scrapegraphai.com/mcp `
  --header 'Authorization: Bearer ${SGAI_API_KEY}'
```

Single quotes matter in PowerShell — `${SGAI_API_KEY}` is valid PowerShell variable syntax, so
double quotes would have expanded it to an empty string at add time.

## One step left, and it has to be done by hand

> **Do not paste the API key into a Claude Code prompt.** Anything typed at the prompt, including
> with the `!` prefix, is stored in the session transcript.

Open a separate PowerShell window and run:

```powershell
setx SGAI_API_KEY "your-key-here"
```

Then close and reopen Claude Code. `setx` writes to the persistent user environment but does not
touch already-running processes, so the current session will not see it.

Verify afterwards:

```powershell
claude mcp list
```

Look for `√ Connected` next to `sgai`. A missing-variable warning instead means the environment
variable did not reach the process — reopen the terminal.

## Why an environment variable rather than the literal key

Claude Code expands `${VAR}` and `${VAR:-default}` in MCP config across all scopes — in `command`,
`args`, `env`, `url`, and `headers`. Using the placeholder keeps `~/.claude.json` free of the
secret while still authenticating.

## Why no `mcp-remote` shim

ScrapeGraphAI's Claude Desktop instructions wrap the endpoint in
`npx mcp-remote@0.1.25 ... --header X-API-Key:...`. Claude Code speaks HTTP transport natively, so
that Node bridge is unnecessary here. The official Claude Code page for the service uses
`Authorization: Bearer` against the same endpoint.

## What it provides

17 tools: scrape, extract, search, crawl, schema generation, scheduled monitors, history, credits.

## Undo

```powershell
claude mcp remove sgai -s user
```

## Sources

- <https://docs.scrapegraphai.com/services/mcp-server>
- <https://docs.scrapegraphai.com/services/mcp-server/claude-code>
- <https://code.claude.com/docs/en/mcp>
- <https://github.com/scrapegraphai/scrapegraph-mcp>
