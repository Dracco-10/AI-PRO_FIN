import type { SocketLike } from "../tipos";

/** WebSocket falso para probar el widget sin server. */
export class FakeSocket implements SocketLike {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;

  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
  }

  // helpers para el test
  open() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }
  receive(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: typeof data === "string" ? data : JSON.stringify(data) }));
  }
  drop() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent("close"));
  }
}

export const fakeFactory = (url: string) => new FakeSocket(url);
export const lastSocket = () => FakeSocket.instances[FakeSocket.instances.length - 1];
