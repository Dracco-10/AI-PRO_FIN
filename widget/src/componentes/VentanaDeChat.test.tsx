import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VentanaDeChat } from "./VentanaDeChat";
import { fakeFactory, FakeSocket, lastSocket } from "../utilidadesDePrueba/socketFalso";

function setup(openUrl = vi.fn()) {
  FakeSocket.instances = [];
  render(<VentanaDeChat wsUrl="ws://test/ws" createSocket={fakeFactory} openUrl={openUrl} defaultOpen reconnectMs={10} />);
  return { openUrl, socket: lastSocket() };
}

describe("VentanaDeChat", () => {
  it("muestra bienvenida, se conecta y habilita el input", async () => {
    const { socket } = setup();
    expect(screen.getByText(/Pedime/)).toBeInTheDocument();
    expect(screen.getByText("Conectando…")).toBeInTheDocument();
    expect(screen.getByLabelText("Escribí tu mensaje")).toBeDisabled();
    act(() => socket.open());
    expect(screen.getByText("En sala")).toBeInTheDocument();
    expect(screen.getByLabelText("Escribí tu mensaje")).toBeEnabled();
    expect(socket.url).toBe("ws://test/ws");
  });

  it("envía el mensaje del usuario por websocket", async () => {
    const { socket } = setup();
    act(() => socket.open());
    await userEvent.type(screen.getByLabelText("Escribí tu mensaje"), "Recomiéndame una de terror{enter}");
    const payload = JSON.parse(socket.sent[0]);
    expect(payload).toMatchObject({ type: "user_message", text: "Recomiéndame una de terror" });
    expect(payload.sessionId).toBeTruthy();
    expect(screen.getByTestId("msg-user")).toHaveTextContent("Recomiéndame una de terror");
    expect(screen.getByLabelText("Escribí tu mensaje")).toHaveValue("");
  });

  it("muestra el indicador de escritura y renderiza markdown con el póster", () => {
    const { socket } = setup();
    act(() => socket.open());
    act(() => socket.receive({ type: "typing" }));
    expect(screen.getByLabelText("Butaca está escribiendo")).toBeInTheDocument();
    act(() =>
      socket.receive({
        type: "assistant_message",
        text: "**El Conjuro** ![Póster de El Conjuro](https://image.tmdb.org/t/p/w500/c.jpg) [Ver en IMDB](https://www.imdb.com/title/tt1/)"
      })
    );
    expect(screen.queryByLabelText("Butaca está escribiendo")).not.toBeInTheDocument();
    expect(screen.getByText("El Conjuro").tagName).toBe("STRONG");
    expect(screen.getByAltText("Póster de El Conjuro")).toHaveAttribute("src", "https://image.tmdb.org/t/p/w500/c.jpg");
    expect(screen.getByText("Ver en IMDB")).toHaveAttribute("target", "_blank");
  });

  it("no ejecuta HTML ni muestra imágenes de dominios no confiables", () => {
    const { socket } = setup();
    act(() => socket.open());
    act(() =>
      socket.receive({ type: "assistant_message", text: '<img src=x onerror="alert(1)"> ![rastreo](https://evil.com/p.gif)' })
    );
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(screen.getByText(/imagen no permitida: rastreo/)).toBeInTheDocument();
  });

  it("abre solo URLs permitidas cuando el server manda la acción", () => {
    const { socket, openUrl } = setup();
    act(() => socket.open());
    act(() =>
      socket.receive({
        type: "assistant_message",
        text: "Listo",
        actions: [
          { type: "open_url", url: "https://www.imdb.com/title/tt1/" },
          { type: "open_url", url: "https://evil.com" }
        ]
      })
    );
    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith("https://www.imdb.com/title/tt1/");
  });

  it("muestra errores del server e ignora mensajes que no son JSON", () => {
    const { socket } = setup();
    act(() => socket.open());
    act(() => socket.receive("basura"));
    act(() => socket.receive({ type: "error", text: "Vas muy rápido" }));
    expect(screen.getByTestId("msg-system")).toHaveTextContent("Vas muy rápido");
  });

  it("se reconecta si se cae la conexión", async () => {
    const { socket } = setup();
    act(() => socket.open());
    act(() => socket.drop());
    expect(screen.getByText("Reconectando…")).toBeInTheDocument();
    await act(() => new Promise((r) => setTimeout(r, 30)));
    expect(FakeSocket.instances.length).toBe(2);
  });

  it("abre y cierra el panel con el botón", async () => {
    FakeSocket.instances = [];
    render(<VentanaDeChat wsUrl="ws://t" createSocket={fakeFactory} />);
    expect(screen.queryByLabelText("Chat con Butaca")).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Abrir chat"));
    expect(screen.getByLabelText("Chat con Butaca")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Cerrar chat"));
    expect(screen.queryByLabelText("Chat con Butaca")).not.toBeInTheDocument();
  });

  it("no envía mensajes vacíos ni si no hay conexión", async () => {
    const { socket } = setup();
    act(() => socket.open());
    socket.readyState = 0;
    await userEvent.type(screen.getByLabelText("Escribí tu mensaje"), "hola{enter}");
    expect(socket.sent).toHaveLength(0);
    expect(screen.getByLabelText("Escribí tu mensaje")).toHaveValue("hola");
  });
});
