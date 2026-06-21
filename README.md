# Jina MCP Server

A lightweight MCP server that exposes `web_reader` via r.jina.ai.

- **stdio** — for 1Panel / Cursor local (default)
- **Streamable HTTP** — optional standalone remote mode (`node http.js`)

## Tool: web_reader

```json
{ "url": "https://example.com" }
```

---

## 1Panel 部署（推荐）

1Panel 会把 **stdio MCP** 自动转成 **SSE** 对外暴露，无需自己写 HTTP 服务。

### 目录规划（建议统一管理所有 MCP）

```text
/opt/mcp-servers/
  jina/          ← 本项目
  fetch/         ← 以后的 MCP
  github/        ← 以后的 MCP
```

### 第一次：部署 Jina MCP

**1. 上传代码到服务器**

```bash
mkdir -p /opt/mcp-servers
cd /opt/mcp-servers
git clone <your-repo-url> jina
cd jina
npm install --omit=dev
```

**2. 在 1Panel 创建 MCP Server**

进入 **AI → MCP → 创建 MCP Server**，选择 **二进制方式运行**：

| 配置项 | 填写 |
|--------|------|
| 名称 | `jina` |
| 启动命令 | `node` |
| 启动参数 | `/opt/mcp-servers/jina/stdio.js` |
| 挂载目录 | 宿主机 `/opt/mcp-servers/jina` → 容器 `/opt/mcp-servers/jina` |

> 如果面板只有 npx 方式、且你的 MCP 已发布到 npm，也可以用：
> 命令 `npx`，参数 `-y jina-mcp-server`

**3. 绑定网站（对外访问）**

在 MCP 详情里绑定域名，例如：

- 域名：`mcp.example.com`
- SSE 路径：`/jina/sse`（每个 MCP 用不同路径）

多个 MCP 可共用同一域名：

```text
https://mcp.example.com/jina/sse
https://mcp.example.com/fetch/sse
https://mcp.example.com/github/sse
```

**4. 安全配置**

- 开启 **HTTPS**（Let's Encrypt 或上传证书）
- 配置 **IP 白名单**（限制可访问的客户端 IP）

**5. 获取客户端配置**

点击 MCP 实例的 **「配置」** 按钮，复制生成的 JSON 到 Cursor：

```json
{
  "mcpServers": {
    "jina": {
      "url": "https://mcp.example.com/jina/sse"
    }
  }
}
```

### 以后新增 MCP 的固定流程

每个新 MCP 重复以下步骤即可：

```bash
# 1. 放到统一目录
cd /opt/mcp-servers
git clone <new-mcp-repo> <name>
cd <name> && npm install --omit=dev   # 或 pip install / go build 等

# 2. 1Panel → AI → MCP → 创建
#    命令: node (或 npx / python / 二进制)
#    参数: /opt/mcp-servers/<name>/stdio.js
#    挂载: /opt/mcp-servers/<name>

# 3. 绑定同一域名，换不同 SSE 路径
#    例如 /fetch/sse、/github/sse

# 4. 复制客户端配置发给用户
```

| MCP 类型 | 启动命令示例 |
|----------|-------------|
| Node.js（本项目） | `node /opt/mcp-servers/jina/stdio.js` |
| npm 包 | `npx -y @modelcontextprotocol/server-fetch` |
| Python | `uvx mcp-server-fetch` |
| 编译好的二进制 | `/opt/mcp-servers/xxx/bin/mcp-xxx` |

---

## 本地开发

```bash
npm install
npm start              # stdio，给 1Panel / Cursor command 模式用
npm run start:http     # 独立 HTTP 模式（不经 1Panel）
```

### Cursor 本地 stdio 配置

```json
{
  "mcpServers": {
    "jina": {
      "command": "node",
      "args": ["/path/to/jina_mcp_server/stdio.js"]
    }
  }
}
```

### 独立 HTTP 模式（不用 1Panel 时）

```bash
MCP_PORT=8000 node http.js
```

```json
{
  "mcpServers": {
    "jina": {
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${env:JINA_MCP_TOKEN}"
      }
    }
  }
}
```

| 变量 | 默认 | 说明 |
|------|------|------|
| `MCP_PORT` | `8000` | HTTP 端口 |
| `MCP_HOST` | `0.0.0.0` | 绑定地址 |
| `MCP_AUTH_TOKEN` | — | Bearer 鉴权 |
| `MCP_ALLOWED_HOSTS` | — | 反代 Host 白名单 |

---

## Docker（可选，非 1Panel 场景）

```bash
docker compose up -d --build
```
