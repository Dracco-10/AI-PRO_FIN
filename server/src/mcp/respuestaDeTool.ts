export async function toolResult(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true };
  }
}
