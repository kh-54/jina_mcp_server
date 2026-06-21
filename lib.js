const https = require("node:https");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const z = require("zod");

const DEFAULT_TIMEOUT = process.env.MCP_JINA_TIMEOUT || "30";
const JINA_API_KEY = process.env.JINA_API_KEY;

function isLikelyEmptyShell(content) {
  const match = content.match(/Markdown Content:\s*\n([\s\S]*)/);
  const body = match ? match[1].trim() : "";
  return body.length < 30;
}

function fetchJina(url, timeoutSec) {
  const target = "https://r.jina.ai/" + url;
  const headers = {
    Accept: "text/plain",
    "X-Timeout": String(timeoutSec),
    "X-No-Cache": "true",
  };

  if (JINA_API_KEY) {
    headers.Authorization = `Bearer ${JINA_API_KEY}`;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      target,
      { method: "GET", headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Jina Reader HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
            return;
          }
          resolve(data);
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function callJina(url) {
  const content = await fetchJina(url, DEFAULT_TIMEOUT);

  // Dynamic pages (e.g. d.biji.com) may return a shell on first pass; retry with longer wait.
  if (isLikelyEmptyShell(content) && Number(DEFAULT_TIMEOUT) < 60) {
    return fetchJina(url, "60");
  }

  return content;
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

module.exports = { createMcpServer, callJina, isLikelyEmptyShell };
