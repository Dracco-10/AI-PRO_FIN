import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDefinition } from "../modeloIA/tiposDelModelo.js";

export interface ToolOutcome {
  text: string;
  isError: boolean;
}

// lo que un agente puede llamar: tools MCP o delegar a otro agente
export interface ToolExecutor {
  definitions(): ToolDefinition[];
  call(name: string, args: Record<string, unknown>): Promise<ToolOutcome>;
}

// cliente y server MCP en el mismo proceso. Si algún día se separan, solo se cambia el transporte (stdio/http)
export async function connectInMemory(server: McpServer, clientName: string): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: clientName, version: "1.0.0" });
  await client.connect(clientTransport);
  return client;
}

interface Entry {
  client: Client;
  definition: ToolDefinition;
}

export class McpToolbox implements ToolExecutor {
  private constructor(private readonly entries: Map<string, Entry>) {}

  static async fromClients(clients: Client[]): Promise<McpToolbox> {
    const entries = new Map<string, Entry>();
    for (const client of clients) {
      const { tools } = await client.listTools();
      for (const t of tools) {
        entries.set(t.name, {
          client,
          definition: {
            name: t.name,
            description: t.description ?? "",
            parameters: t.inputSchema as Record<string, unknown>
          }
        });
      }
    }
    return new McpToolbox(entries);
  }

  // cada agente recibe solo lo que necesita
  only(names: string[]): McpToolbox {
    return new McpToolbox(new Map([...this.entries].filter(([name]) => names.includes(name))));
  }

  definitions(): ToolDefinition[] {
    return [...this.entries.values()].map((e) => e.definition);
  }

  async call(name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
    const entry = this.entries.get(name);
    if (!entry) return { text: JSON.stringify({ error: `Tool desconocida: ${name}` }), isError: true };
    try {
      const res = await entry.client.callTool({ name, arguments: args });
      const content = (res.content ?? []) as Array<{ type: string; text?: string }>;
      const text = content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
      return { text, isError: Boolean(res.isError) };
    } catch (err) {
      return { text: JSON.stringify({ error: (err as Error).message }), isError: true };
    }
  }
}

export class CompositeExecutor implements ToolExecutor {
  constructor(private readonly executors: ToolExecutor[]) {}

  definitions(): ToolDefinition[] {
    return this.executors.flatMap((e) => e.definitions());
  }

  async call(name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
    const owner = this.executors.find((e) => e.definitions().some((d) => d.name === name));
    if (!owner) return { text: JSON.stringify({ error: `Tool desconocida: ${name}` }), isError: true };
    return owner.call(name, args);
  }
}
