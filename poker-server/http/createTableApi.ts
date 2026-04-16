import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreateTableRequest, CreateTableResponse } from "poker-shared";
import { createRoom } from "../game/rooms.js";
import { tableConfigFromCreateRequest } from "../game/tableConfig.js";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * Handle `POST /api/tables` and CORS `OPTIONS`. Returns true if handled.
 */
export async function handleCreateTableApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url?.split("?")[0] ?? "";
  if (url !== "/api/tables") {
    return false;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return true;
  }

  if (req.method === "POST") {
    try {
      const raw = await readBody(req);
      const parsed = raw.length ? (JSON.parse(raw) as CreateTableRequest) : {};
      const config = tableConfigFromCreateRequest(parsed);
      const roomId = createRoom(config);
      const out: CreateTableResponse = {
        roomId,
        playPath: `/play/${roomId}`,
      };
      sendJson(res, 201, out);
    } catch {
      sendJson(res, 400, { error: "invalid_body" });
    }
    return true;
  }

  sendJson(res, 405, { error: "method_not_allowed" });
  return true;
}
