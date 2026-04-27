const ws = new WebSocket(`ws://${location.host}`);

ws.onopen = () => {
  console.log("[client] websocket connected");
};

let canvas, ctx;

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);

  if (msg.type === "frame") {
    if (!canvas) {
      canvas = document.getElementById("remote");
      ctx = canvas.getContext("2d");
      setupInputHandlers(canvas);
    }

    const img = new Image();
    img.onload = () => {
      // adatta il canvas alla dimensione del frame
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/${msg.format};base64,${msg.data}`;
  }

  if (msg.type === "host-status") {
    console.log("[client] host connected:", msg.connected);
  }
};

// ---------------------------------------------------------
// MOUSE EVENTS (sul canvas)
// ---------------------------------------------------------
function setupInputHandlers(canvas) {
  // assicuriamoci che il canvas possa ricevere focus
  canvas.setAttribute("tabindex", "0");
  canvas.focus();

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ws.send(JSON.stringify({
      type: "mouse-move",
      x,
      y
    }));
  });

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ws.send(JSON.stringify({
      type: "mouse-down",
      button: e.button,
      x,
      y
    }));

    // porta il focus sul canvas quando clicchi
    canvas.focus();
  });

  canvas.addEventListener("mouseup", (e) => {
    ws.send(JSON.stringify({
      type: "mouse-up",
      button: e.button
    }));
  });

  canvas.addEventListener("wheel", (e) => {
    ws.send(JSON.stringify({
      type: "scroll",
      dy: e.deltaY
    }));
  });

  // -------------------------------------------------------
  // KEYBOARD EVENTS — formato compatibile con desktop-host
  // -------------------------------------------------------

  // blocca il browser dal mangiare Alt, AltGr, ecc.
  window.addEventListener("keydown", (e) => {
    e.preventDefault();
  }, { capture: true });

  window.addEventListener("keyup", (e) => {
    e.preventDefault();
  }, { capture: true });

  // eventi reali sul canvas (quelli che useremo)
  canvas.addEventListener("keydown", (e) => {
    e.preventDefault();

    // inviamo esattamente ciò che l'host si aspetta:
    // msg.key e msg.code
    ws.send(JSON.stringify({
      type: "key-down",
      key: e.key,   // es: "a", "A", "AltGraph", "Shift", "Enter"
      code: e.code  // es: "KeyA", "AltRight", "ShiftLeft"
    }));
  });

  canvas.addEventListener("keyup", (e) => {
    e.preventDefault();

    ws.send(JSON.stringify({
      type: "key-up",
      key: e.key,
      code: e.code
    }));
  });

  // opzionale: prova a bloccare i tasti modificatori a livello API
  if (navigator.keyboard && navigator.keyboard.lock) {
    navigator.keyboard.lock(["Alt", "AltGraph", "Shift", "Control"]).catch(() => {});
  }
}
