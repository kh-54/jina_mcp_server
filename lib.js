const https = require("node:https");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const z = require("zod");

function callJina(url) {
  const target = "https://r.jina.ai/" + url;

  return new Promise((resolve, reject) => {
    https
      .get(target, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function createMcpServer() {
  const server = new McpServer(
    { name: "jina-mcp-server", version: "1.0.0" },
    { capabilities: { logging: {} } }
  );

  server.registerTool(
    "web_reader",
    {
      description: "Fetch clean webpage content via Jina Reader",
      inputSchema: {
        url: z.string().describe("URL to fetch"),
      },
    },
    async ({ url }) => {
      const content = await callJina(url);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ url, content, source: "r.jina.ai" }, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

module.exports = { createMcpServer };
