"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { normalizeHex, qrColorWarning } from "@/lib/color.ts";

/** Makes a QR code in the browser. The text never leaves the page. */
export function QrTool() {
  const [text, setText] = useState("https://example.com");
  const [fg, setFg] = useState("#111111");
  const [bg, setBg] = useState("#ffffff");
  const [size, setSize] = useState(800);
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const colors = { dark: normalizeHex(fg) ?? "#111111", light: normalizeHex(bg) ?? "#ffffff" };
  const warn = qrColorWarning(colors.dark, colors.light);

  useEffect(() => {
    if (!text.trim() || !canvas.current) return;
    QRCode.toCanvas(canvas.current, text, { width: 240, margin: 2, errorCorrectionLevel: level, color: colors })
      .then(() => setError(""))
      .catch(() => setError("That is too long for a QR code. Shorten the text or lower the error correction."));
  }, [text, level, colors.dark, colors.light]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (href: string, name: string) => { const a = document.createElement("a"); a.href = href; a.download = name; a.click(); };
  const png = async () => save(await QRCode.toDataURL(text, { width: size, margin: 2, errorCorrectionLevel: level, color: colors }), "qr-code.png");
  const svg = async () => {
    const s = await QRCode.toString(text, { type: "svg", margin: 2, errorCorrectionLevel: level, color: colors });
    const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
    save(url, "qr-code.svg"); URL.revokeObjectURL(url);
  };
  const ok = !!text.trim() && !error;
  return (
    <div className="tool">
      <div className="stack">
        <div className="field">
          <label htmlFor="qr-text">Web address or text</label>
          <textarea id="qr-text" className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
          <span className="hint">A web address, a phone number as tel:+123, a Wi-Fi code or any text.</span>
        </div>
        <div className="grid2">
          <div className="field"><label htmlFor="qr-fg">Code colour</label><input id="qr-fg" className="input" type="color" value={colors.dark} onChange={(e) => setFg(e.target.value)} /></div>
          <div className="field"><label htmlFor="qr-bg">Background</label><input id="qr-bg" className="input" type="color" value={colors.light} onChange={(e) => setBg(e.target.value)} /></div>
        </div>
        {warn && <div className="notice warn" role="alert">{warn}</div>}
        <div className="grid2">
          <div className="field"><label htmlFor="qr-size">PNG size</label>
            <select id="qr-size" className="input" value={size} onChange={(e) => setSize(Number(e.target.value))}>{[400, 800, 1200, 2000].map((n) => <option key={n} value={n}>{n} x {n} pixels</option>)}</select></div>
          <div className="field"><label htmlFor="qr-level">Error correction</label>
            <select id="qr-level" className="input" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
              <option value="L">Low: smallest code</option><option value="M">Medium: a good default</option><option value="Q">Quartile</option><option value="H">High: survives wear and a small logo</option></select></div>
        </div>
      </div>
      <div className="tool-out">
        <h2>Your QR code</h2>
        {error ? <p className="notice bad" role="alert">{error}</p> : <canvas ref={canvas} className="qr-canvas" width={240} height={240} role="img" aria-label="Preview of your QR code" />}
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={!ok} onClick={png}><Download className="icon" /> Download PNG</button>
          <button type="button" className="btn" disabled={!ok} onClick={svg}><Download className="icon" /> Download SVG</button>
        </div>
        <p className="small muted">Use SVG for print: it stays sharp at any size. Test the code with two phones before you print.</p>
      </div>
    </div>
  );
}
