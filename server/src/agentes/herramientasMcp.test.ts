import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { connectInMemory, McpToolbox } from "./herramientasMcp.js";

function demoServer() {
  const server = new McpServer({ name: "demo", version: "1.0.0" });
  server.registerTool("echo", { description: "eco", inputSchema: { msg: z.string() } }, ({ msg }) => ({
    content: [{ type: "text", text: msg }]
  }));
  server.registerTool("image", {}, () => ({ content: [{ type: "image", data: "", mimeType: "image/png" }] }));
  return server;
}

describe("McpToolbox", () => {
  it("lista las tools en formato del LLM, filtra y llama", async () => {
    const client = await connectInMemory(demoServer(), "t");
    const toolbox = await McpToolbox.fromClients([client]);
    expect(toolbox.definitions().map((d) => d.name)).toEqual(["echo", "image"]);
    expect(toolbox.definitions()[1].description).toBe("");
    expect(toolbox.only(["echo"]).definitions()).toHaveLength(1);
    expect(await toolbox.call("echo", { msg: "hola" })).toEqual({ text: "hola", isError: false });
    expect(await toolbox.call("image", {})).toEqual({ text: "", isError: false });
    expect((await toolbox.call("nope", {})).isError).toBe(true);
    // argumentos inválidos: el SDK responde con error y el toolbox lo reporta
    expect((await toolbox.call("echo", { msg: 5 })).isError).toBe(true);
    await client.close();
    // cliente cerrado: callTool lanza excepción y el toolbox la convierte en error
    expect((await toolbox.call("echo", { msg: "x" })).isError).toBe(true);
  });
});
