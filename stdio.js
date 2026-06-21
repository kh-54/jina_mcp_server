#!/usr/bin/env node

const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { createMcpServer } = require("./lib.js");

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
