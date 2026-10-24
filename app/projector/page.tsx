"use client";

import { useEffect, useState } from "react";

type ProjectorState = {
  names: string[]; scores: number[]; current?: { title?: string; image: string };
  cardIndex: number; cardCount: number; activePlayer: number; seconds: number;
  timeLeft: number; started: boolean; finished: boolean; category?: string;
  feedback: "correct" | "wrong" | "time" | "reveal" | ""; answeredPlayer?: number | null; wrongAttempts?: number; winner?: number | null; timedOutPlayer?: number | null; bonus?: number; showAnswer: boolean; round: number;
  timerBanks: Record<string, number>; selectedCategory?: string;
};
const emptyState: ProjectorState = {
  names: ["PLAYER 1", "PLAYER 2"], scores: [0, 0], current: undefined,
  cardIndex: 0, cardCount: 0, activePlayer: 0, seconds: 10, timeLeft: 10,
  started: false, finished: false, feedback: "", showAnswer: false, round: 1, timerBanks: {},
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
        {[0, 1].map((p) => <div key={p} style={{ display: "flex", alignItems: "center", gap: "1vw", border: `${((game.feedback === "correct" && game.answeredPlayer === p) || (game.finished && game.winner === p)) ? 3 : 1}px solid ${((game.feedback === "correct" && game.answeredPlayer === p) || (game.finished && game.scores?.[0] !== game.scores?.[1] && (game.scores?.[p] ?? 0) > (game.scores?.[1 - p] ?? 0))) ? "#65e6a5" : game.started && game.activePlayer === p ? "#e8b85a" : "#2b2d38"}`, background: ((game.feedback === "correct" && game.answeredPlayer === p) || (game.finished && game.scores?.[0] !== game.scores?.[1] && (game.scores?.[p] ?? 0) > (game.scores?.[1 - p] ?? 0))) ? "#0f2a1c" : game.started && game.activePlayer === p ? "#242017" : "#111218", boxShadow: ((game.feedback === "correct" && game.answeredPlayer === p) || (game.finished && game.scores?.[0] !== game.scores?.[1] && (game.scores?.[p] ?? 0) > (game.scores?.[1 - p] ?? 0))) ? "0 0 36px #65e6a577" : "none", transition: "all .25s", borderRadius: 14, padding: "0.8vh 1.2vw" }}>
          <div style={{ color: "#e8b85a", fontSize: "clamp(16px,2vw,30px)" }}>{p === 0 ? "壱" : "弐"}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: "#9c9ba7", fontSize: "clamp(9px,.85vw,13px)", letterSpacing: ".12em" }}>PLAYER 0{p + 1}{game.started && game.activePlayer === p ? " · GUESSING" : ""}</div><div style={{ fontWeight: 800, fontSize: "clamp(15px,2vw,28px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.names?.[p] || `PLAYER ${p + 1}`}</div></div>
          <div style={{ textAlign: "center", minWidth: "clamp(112px,13vw,190px)", padding: "0.7vh 1vw", borderRadius: 12, background: (game.timerBanks?.[`${p}:${game.selectedCategory || ""}`] ?? 60) <= 10 ? "#3a1723" : "#292319", border: `2px solid ${(game.timerBanks?.[`${p}:${game.selectedCategory || ""}`] ?? 60) <= 10 ? "#fa557a" : "#8c6c31"}` }}>
            <div style={{ color: "#c9c5ce", fontSize: "clamp(8px,.8vw,12px)", fontWeight: 800, letterSpacing: ".14em" }}>TIME LEFT</div>
            <div style={{ fontWeight: 1000, fontSize: "clamp(30px,4vw,58px)", lineHeight: 1.05, color: (game.timerBanks?.[`${p}:${game.selectedCategory || ""}`] ?? 60) <= 10 ? "#ff6684" : "#ffd477", fontVariantNumeric: "tabular-nums", textShadow: "0 2px 12px #0008" }}>
              {Math.ceil(game.timerBanks?.[`${p}:${game.selectedCategory || ""}`] ?? 60)}<span style={{ fontSize: ".48em", marginLeft: 3 }}>SEC</span>
            </div>
            <div style={{ color: game.started && game.activePlayer === p ? "#65e6a5" : "#aaa7b2", fontSize: "clamp(8px,.75vw,11px)", fontWeight: 900, letterSpacing: ".1em", marginTop: 3 }}>{(game.timerBanks?.[`${p}:${game.selectedCategory || ""}`] ?? 60) <= 0 ? "✕ OUT OF TIME" : game.started && game.activePlayer === p ? "● COUNTING DOWN" : "Ⅱ PAUSED"}</div>
          </div>
          <div style={{ fontWeight: 900, fontSize: "clamp(22px,2.8vw,40px)", color: "#e8b85a", marginLeft: "0.6vw" }}>{String(game.scores?.[p] ?? 0).padStart(2, "0")}</div>
        </div>)}
      </section>
      <section style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", border: `3px solid ${game.feedback === "correct" ? "#65e6a5" : game.feedback === "wrong" || game.feedback === "time" ? "#fa557a" : "#38313e"}`, borderRadius: 18, overflow: "hidden", background: "#111218", boxShadow: game.feedback === "correct" ? "0 0 40px #65e6a533" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "1.2vh 1.5vw", color: "#aaa8b5", fontWeight: 800, letterSpacing: ".12em", fontSize: "clamp(10px,1vw,16px)" }}><span>{game.category || "MYSTERY FRAME"}</span><span>{game.started ? "PLAYER TIMERS ABOVE" : game.finished ? "GAME COMPLETE" : "GET READY"}</span></div>
        <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "radial-gradient(ellipse at center, #292033 0%, #111218 72%)" }}>
          {game.current?.image ? <img src={game.current.image} alt="Mystery anime" style={{ maxWidth: "100%", maxHeight: "100%", width: "100%", height: "100%", objectFit: "contain" }} /> : <img src="/default-mystery.svg" alt="Get ready to play" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
          {false && <div style={{ textAlign: "center", color: "#e8b85a", textShadow: "0 0 35px #e8b85a33" }}><div style={{ fontSize: "clamp(18px,3vw,46px)", letterSpacing: ".2em" }}>YOUR NEXT</div><div style={{ fontSize: "clamp(54px,11vw,150px)", fontWeight: 900, lineHeight: 1 }}>ANIME</div><div style={{ fontSize: "clamp(18px,3vw,46px)", letterSpacing: ".2em" }}>GOES HERE　?</div></div>}
          {game.feedback === "correct" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#07170ddd", color: "#65e6a5", textAlign: "center", alignContent: "center", fontWeight: 900, letterSpacing: ".06em" }}><div><div style={{ fontSize: "clamp(14px,2vw,30px)", letterSpacing: ".3em", color: "#b9f5d3" }}>ROUND WINNER</div><div style={{ fontSize: "clamp(40px,8vw,120px)", lineHeight: 1.1, color: "#fff", textShadow: "0 0 40px #65e6a5aa" }}>{game.names?.[game.answeredPlayer ?? 0] || "PLAYER"}</div><div style={{ fontSize: "clamp(20px,3vw,44px)" }}>✓ CORRECT! +1 POINT · +{game.bonus ?? 2} SEC</div></div></div>}
          {(game.feedback === "wrong" || game.feedback === "time") && <div style={{ position: "absolute", inset: 0, zIndex: 4, display: "grid", placeItems: "center", textAlign: "center", background: "#2a0a14ee", color: "#fa557a", fontWeight: 900 }}><div><div style={{ fontSize: "clamp(14px,2vw,30px)", letterSpacing: ".3em", color: "#ffb3c3" }}>{game.names?.[game.activePlayer] || "PLAYER"}</div><div style={{ fontSize: "clamp(40px,8vw,120px)", lineHeight: 1.1, color: "#fff", textShadow: "0 0 40px #fa557acc" }}>{game.feedback === "time" ? "⌛ TIME'S UP" : "✕ WRONG!"}</div>{(game.timerBanks?.[`${game.activePlayer}:${game.selectedCategory || ""}`] ?? 60) <= 0 ? <div style={{ fontSize: "clamp(20px,3vw,44px)" }}>{game.names?.[1 - game.activePlayer] || "OTHER PLAYER"} WINS!</div> : (game.wrongAttempts ?? 0) === 0 && <div style={{ fontSize: "clamp(20px,3vw,44px)" }}>OTHER PLAYER'S TURN</div>}</div></div>}
          {game.feedback === "reveal" && <div style={{ position: "absolute", inset: 0, zIndex: 4, display: "grid", placeItems: "center", textAlign: "center", background: "#14100aee", color: "#e8b85a", fontWeight: 900 }}><div><div style={{ fontSize: "clamp(14px,2vw,30px)", letterSpacing: ".3em", color: "#fa8b73" }}>NOBODY GOT IT</div><div style={{ fontSize: "clamp(14px,1.6vw,26px)", letterSpacing: ".25em", color: "#b9b8c3", marginTop: "1vh" }}>THE ANSWER WAS</div><div style={{ fontSize: "clamp(36px,7vw,110px)", lineHeight: 1.1, color: "#fff", textShadow: "0 0 40px #e8b85a88" }}>{game.current?.title}</div></div></div>}
          {game.finished && (() => { const a = game.scores?.[0] ?? 0, b = game.scores?.[1] ?? 0; const tie = game.winner == null; const w = game.winner ?? 0; return <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "grid", placeItems: "center", textAlign: "center", background: tie ? "#14121fee" : "#07170dee", color: tie ? "#e8b85a" : "#65e6a5", fontWeight: 900 }}><div><div style={{ fontSize: "clamp(14px,2vw,30px)", letterSpacing: ".3em", color: tie ? "#f3d795" : "#b9f5d3" }}>{tie ? "FINAL RESULT" : "WINNER"}</div><div style={{ fontSize: "clamp(40px,8vw,120px)", lineHeight: 1.1, color: "#fff", textShadow: `0 0 40px ${tie ? "#e8b85aaa" : "#65e6a5aa"}` }}>{tie ? "IT'S A DRAW!" : `${game.names?.[w] || `PLAYER ${w + 1}`} WINS!`}</div><div style={{ fontSize: "clamp(20px,3vw,44px)", marginTop: "1vh" }}>{tie ? `${game.names?.[0] || "PLAYER 1"} & ${game.names?.[1] || "PLAYER 2"} · ` : ""}{game.timedOutPlayer != null ? `${game.names?.[game.timedOutPlayer] || "PLAYER"} ran out of time · ` : ""}{a} — {b}</div></div></div>; })()}
          {game.showAnswer && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "2vh 2vw", textAlign: "center", background: "#08090eee" }}><div style={{ color: "#e8b85a", letterSpacing: ".18em", fontSize: "clamp(12px,1.5vw,22px)" }}>THE ANSWER WAS</div><div style={{ fontSize: "clamp(28px,4vw,58px)", fontWeight: 900 }}>{game.current?.title}</div></div>}
        </div>
      </section>
      <footer style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#9697a4", fontSize: "clamp(9px,.85vw,13px)", letterSpacing: ".12em", fontWeight: 700 }}><span>{game.started ? `${game.names?.[game.activePlayer] || "PLAYER"} IS GUESSING` : game.finished ? "FINAL SCORE" : "READY WHEN YOU ARE"}</span><span>NO HINTS. JUST KNOWLEDGE.</span></footer>
    </main>
  );
}
