---
trigger: always_on
---

When browser automation or end-to-end testing is required, prefer using the Playwright CLI over Playwright MCP whenever the task can be completed reliably through the CLI.

Use Playwright MCP only when the CLI is unavailable, insufficient for the task, or when MCP-specific interactive browser capabilities are explicitly required.

Do not default to Playwright MCP merely because it is available.