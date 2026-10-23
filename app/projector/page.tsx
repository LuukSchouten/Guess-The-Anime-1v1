"use client";

import { useEffect, useState } from "react";

type ProjectorState = {
  names: string[]; scores: number[]; current?: { title: string; image: string };
  cardIndex: number; cardCount: number; activePlayer: number; seconds: number;
  timeLeft: number; started: boolean; finished: boolean;
  feedback: "correct" | "wrong" | "time" | ""; showAnswer: boolean; round: number;
};
const emptyState: ProjectorState = {
  names: ["PLAYER 1", "PLAYER 2"], scores: [0, 0], current: undefined,
  cardIndex: 0, cardCount: 0, activePlayer: 0, seconds: 10, timeLeft: 10,
  started: false, finished: false, feedback: "", showAnswer: false, round: 1,
};

export default function ProjectorPage() {
  const [game, setGame] = useState<ProjectorState>(emptyState);
  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem("anime-floor-projector-state");
        if (raw) setGame({ ...emptyState, ...JSON.parse(raw) });
      } catch {}
    };
    sync();
    window.addEventListener("storage", sync);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("anime-floor-projector") : null;
    if (channel) channel.onmessage = (event) => setGame({ ...emptyState, ...event.data });
    return () => { window.removeEventListener("storage", sync); channel?.close(); };
  }, []);

  const remaining = Math.max(0, Math.min(100, (game.timeLeft / Math.max(1, game.seconds)) * 100));
  return (
    <main style={{ height: "100dvh", minHeight: 0, width: "100%", boxSizing: "border-box", background: "#090a0f", color: "#f7f5f2", padding: "1.5vh 2vw", fontFamily: "Arial, Helvetica, sans-serif", display: "flex", flexDirection: "column", gap: "1.2vh", overflow: "hidden" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2b2d38", paddingBottom: "0.8vh", flexShrink: 0 }}>
        <div style={{ color: "#e8b85a", fontWeight: 900, letterSpacing: ".16em", fontSize: "clamp(16px,2vw,30px)" }}>✦ ANIME FLOOR</div>
        <div style={{ color: "#b9b8c3", fontWeight: 700, letterSpacing: ".12em", fontSize: "clamp(12px,1.3vw,20px)" }}>ROUND {String(game.round).padStart(2, "0")}　·　IMAGE {String(Math.min(game.cardIndex + 1, Math.max(1, game.cardCount))).padStart(2, "0")} / {String(game.cardCount).padStart(2, "0")}</div>
      </header>
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1vw", flexShrink: 0 }}>
        {[0, 1].map((p) => <div key={p} style={{ display: "flex", alignItems: "center", gap: "1vw", border: `1px solid ${game.started && game.activePlayer === p ? "#e8b85a" : "#2b2d38"}`, background: game.started && game.activePlayer === p ? "#242017" : "#111218", borderRadius: 14, padding: "0.8vh 1.2vw" }}>
          <div style={{ color: "#e8b85a", fontSize: "clamp(16px,2vw,30px)" }}>{p === 0 ? "壱" : "弐"}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: "#9c9ba7", fontSize: "clamp(9px,.85vw,13px)", letterSpacing: ".12em" }}>PLAYER 0{p + 1}{game.started && game.activePlayer === p ? " · GUESSING" : ""}</div><div style={{ fontWeight: 800, fontSize: "clamp(15px,2vw,28px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.names?.[p] || `PLAYER ${p + 1}`}</div></div>
          <div style={{ fontWeight: 900, fontSize: "clamp(22px,2.8vw,40px)", color: "#e8b85a" }}>{String(game.scores?.[p] ?? 0).padStart(2, "0")}</div>
        </div>)}
      </section>
      <section style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", border: `3px solid ${game.feedback === "correct" ? "#65e6a5" : game.feedback === "wrong" || game.feedback === "time" ? "#fa557a" : "#38313e"}`, borderRadius: 18, overflow: "hidden", background: "#111218", boxShadow: game.feedback === "correct" ? "0 0 40px #65e6a533" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "1.2vh 1.5vw", color: "#aaa8b5", fontWeight: 800, letterSpacing: ".12em", fontSize: "clamp(10px,1vw,16px)" }}><span>MYSTERY FRAME</span><span>{game.started ? `${Math.ceil(game.timeLeft)} SECONDS LEFT` : game.finished ? "GAME COMPLETE" : "GET READY"}</span></div>
        <div style={{ height: 5, background: "#292832", flexShrink: 0 }}><div style={{ height: "100%", width: `${remaining}%`, background: game.timeLeft <= 5 ? "#fa557a" : "#e8b85a", transition: "width 100ms linear" }} /></div>
        <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "radial-gradient(ellipse at center, #292033 0%, #111218 72%)" }}>
          {game.current?.image ? <img src={game.current.image} alt="Mystery anime" style={{ maxWidth: "100%", maxHeight: "100%", width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ textAlign: "center", color: "#e8b85a", textShadow: "0 0 35px #e8b85a33" }}><div style={{ fontSize: "clamp(18px,3vw,46px)", letterSpacing: ".2em" }}>YOUR NEXT</div><div style={{ fontSize: "clamp(54px,11vw,150px)", fontWeight: 900, lineHeight: 1 }}>ANIME</div><div style={{ fontSize: "clamp(18px,3vw,46px)", letterSpacing: ".2em" }}>GOES HERE　?</div></div>}
          {game.feedback === "correct" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#07170dbb", color: "#65e6a5", fontSize: "clamp(28px,5vw,76px)", fontWeight: 900, letterSpacing: ".06em" }}>✓ CORRECT! +1 POINT</div>}
          {(game.feedback === "wrong" || game.feedback === "time") && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#1a0810bb", color: "#fa557a", fontSize: "clamp(28px,5vw,76px)", fontWeight: 900, letterSpacing: ".06em" }}>{game.feedback === "time" ? "⌛ TIME'S UP" : "✕ WRONG — OTHER PLAYER'S TURN"}</div>}
          {game.showAnswer && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "2vh 2vw", textAlign: "center", background: "#08090eee" }}><div style={{ color: "#e8b85a", letterSpacing: ".18em", fontSize: "clamp(12px,1.5vw,22px)" }}>THE ANSWER WAS</div><div style={{ fontSize: "clamp(28px,4vw,58px)", fontWeight: 900 }}>{game.current?.title}</div></div>}
        </div>
      </section>
      <footer style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#9697a4", fontSize: "clamp(9px,.85vw,13px)", letterSpacing: ".12em", fontWeight: 700 }}><span>{game.started ? `${game.names?.[game.activePlayer] || "PLAYER"} IS GUESSING` : game.finished ? "FINAL SCORE" : "READY WHEN YOU ARE"}</span><span>NO HINTS. JUST KNOWLEDGE.</span></footer>
    </main>
  );
}
