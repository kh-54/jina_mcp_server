#!/usr/bin/env node

const { randomUUID } = require("node:crypto");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { createMcpExpressApp } = require("@modelcontextprotocol/sdk/server/express.js");
const { isInitializeRequest } = require("@modelcontextprotocol/sdk/types.js");
const { createMcpServer } = require("./lib.js");

const PORT = parseInt(process.env.MCP_PORT || "8000", 10);
const HOST = process.env.MCP_HOST || "0.0.0.0";
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const ALLOWED_HOSTS = process.env.MCP_ALLOWED_HOSTS
  ? process.env.MCP_ALLOWED_HOSTS.split(",").map((h) => h.trim())
  : undefined;

function authMiddleware(req, res, next) {
  if (!AUTH_TOKEN) return next();

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  if (token !== AUTH_TOKEN) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }

  next();
}

const app = createMcpExpressApp({ host: HOST, allowedHosts: ALLOWED_HOSTS });
const transports = {};

async function handleMcpPost(req, res) {
  try {
    const sessionId = req.headers["mcp-session-id"];
    let transport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports[id] = transport;
        },
      });

      transport.onclose = () => {
        const id = transport.sessionId;
        if (id && transports[id]) delete transports[id];
      };

      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(sessionId ? 404 : 400).json({
        jsonrpc: "2.0",
        error: {
          code: sessionId ? -32001 : -32000,
          message: sessionId ? "Session not found" : "Bad Request: valid session required",
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP POST error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}

async function handleMcpGet(req, res) {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  await transports[sessionId].handleRequest(req, res);
}

async function handleMcpDelete(req, res) {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  try {
    await transports[sessionId].handleRequest(req, res);
  } finally {
    delete transports[sessionId];
  }
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "jina-mcp-server" });
});

app.post("/mcp", authMiddleware, handleMcpPost);
app.get("/mcp", authMiddleware, handleMcpGet);
app.delete("/mcp", authMiddleware, handleMcpDelete);

app.listen(PORT, HOST, () => {
  console.log(`Jina MCP server listening on http://${HOST}:${PORT}/mcp`);
  if (AUTH_TOKEN) console.log("Auth: Bearer token required");
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
