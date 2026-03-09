import { useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider, appleProvider } from "./firebase";

// ── Styles ────────────────────────────────────────────────────────────────
const s = {
  bg: "#F5EFE6", card: "#FDF8F2", accent: "#C17F3E",
  accentLight: "#E8C99A", text: "#3B2F1E", textMuted: "#8C7355",
  border: "#E2D5C3", highlight: "#7A4F2D",
};
const ctr = {
  minHeight: "100vh",
  background: "linear-gradient(160deg, #F5EFE6 0%, #EDE3D5 50%, #E8D8C0 100%)",
  fontFamily: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "24px 16px", position: "relative", overflow: "hidden",
};
const card = {
  background: "#FDF8F2", border: "1px solid #E2D5C3", borderRadius: "16px",
  padding: "40px 36px", maxWidth: "640px", width: "100%",
  boxShadow: "0 8px 40px rgba(90,60,20,0.10), 0 2px 8px rgba(90,60,20,0.06)", position: "relative",
};
const bar = {
  width: "48px", height: "3px",
  background: "linear-gradient(90deg, #C17F3E, #E8C99A)",
  borderRadius: "2px", margin: "0 auto 28px auto",
};
const btn = {
  background: "linear-gradient(135deg, #C17F3E, #7A4F2D)",
  color: "#FDF8F2", border: "none", borderRadius: "10px",
  padding: "14px 32px", fontSize: "15px",
  fontFamily: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
  cursor: "pointer", letterSpacing: "0.04em",
  boxShadow: "0 4px 16px rgba(193,127,62,0.25)", transition: "transform 0.15s, box-shadow 0.15s",
};
const ghost = {
  ...btn, background: "transparent", color: "#C17F3E",
  border: "1.5px solid #E8C99A", boxShadow: "none",
};

// ── Helpers ───────────────────────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

async function loadUserData(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

async function saveUserData(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
  } catch {}
}

function buildSystemPrompt(sessions) {
  const past = Object.values(sessions);
  let historyNote = "";
  if (past.length > 0) {
    const used = past.map(sess => {
      const r = sess.reading;
      const who = r.attribution ? r.attribution : "(historical moment)";
      return `- "${r.title}" — ${who} [theme: ${r.theme}]`;
    }).join("\n");
    historyNote = `\n\nIMPORTANT — the user has already seen these sessions. Do NOT repeat any of these sources, attributions, themes back-to-back, or titles. Choose something genuinely different:\n${used}\n`;
  }
  return `You are a mindful secular devotional guide. Generate a daily reflection in JSON format only — no markdown, no backticks, just raw JSON.

The reading should be drawn from one of these themes: Stoicism & ancient philosophy, Eastern philosophy (Buddhism, Taoism), Renaissance & Enlightenment thinkers, Modern psychology & mindfulness, Historical events & figures, Literature & poetry, Science & nature.${historyNote}
Return this exact JSON structure:
{
  "theme": "the theme used",
  "source_type": "quote" or "historical_moment",
  "title": "a short evocative title for today's reading (5 words or fewer)",
  "content": "either a direct quote (with attribution) OR a short 2-3 sentence historical vignette that invites reflection",
  "attribution": "name and context (e.g. Marcus Aurelius, Meditations, ~170 AD) — or null if source_type is historical_moment",
  "context": "2-3 sentences of warm, thoughtful context explaining why this quote or moment still matters for inner life today",
  "reflection_prompts": ["a deeply personal reflection question", "a second reflection question that connects to daily life", "a third that gently challenges assumptions"],
  "closing_intention": "a single sentence — a gentle, grounding intention to carry through the day. Should feel like a whisper, not a command."
}

Be thoughtful, varied, and avoid cliches. Draw from unexpected sources sometimes. The tone should be warm, wise, and never preachy.`;
}

// ── Components ────────────────────────────────────────────────────────────
const Leaf = ({ style }) => (
  <svg style={style} width="60" height="60" viewBox="0 0 60 60" fill="none" opacity="0.12">
    <path d="M10 50 Q20 10 50 10 Q50 40 10 50Z" fill="#C17F3E" />
    <path d="M10 50 Q30 30 50 10" stroke="#C17F3E" strokeWidth="1.5" fill="none"/>
  </svg>
);

function SignInScreen({ onSignIn, error }) {
  return (
    <div style={ctr}>
      <Leaf style={{ position:"absolute", top:20, right:30, transform:"rotate(30deg)" }} />
      <Leaf style={{ position:"absolute", bottom:30, left:20, transform:"rotate(200deg)" }} />
      <div style={card}>
        <div style={bar} />
        <h1 style={{ color:"#3B2F1E", fontSize:"32px", fontWeight:"normal", textAlign:"center", margin:"0 0 6px" }}>Mindful Moment</h1>
        <p style={{ color:"#8C7355", fontSize:"15px", textAlign:"center", marginBottom:"36px", lineHeight:1.6, fontStyle:"italic" }}>
          A quiet space for reflection.<br />Ten minutes, once a day.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"32px" }}>
          {["Ancient wisdom","Eastern thought","Science & nature","Philosophy","History","Literature"].map(t => (
            <div key={t} style={{ background:"rgba(232,201,154,0.27)", border:"1px solid #E2D5C3", borderRadius:"8px", padding:"8px", textAlign:"center", fontSize:"11px", color:"#8C7355", letterSpacing:"0.04em" }}>{t}</div>
          ))}
        </div>
        <p style={{ color:"#3B2F1E", fontSize:"13px", textAlign:"center", marginBottom:"16px" }}>Sign in to begin your practice</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px", alignItems:"center" }}>
          <button
            style={{ ...btn, display:"flex", alignItems:"center", gap:"10px", padding:"13px 28px", background:"#fff", color:"#3B2F1E", border:"1.5px solid #E2D5C3", boxShadow:"0 2px 8px rgba(90,60,20,0.08)" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 16px rgba(90,60,20,0.14)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow="0 2px 8px rgba(90,60,20,0.08)"}
            onClick={() => onSignIn("google")}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
          <button
            style={{ ...btn, display:"flex", alignItems:"center", gap:"10px", padding:"13px 28px", background:"#000", color:"#fff", border:"none" }}
            onMouseEnter={e => e.currentTarget.style.background="#222"}
            onMouseLeave={e => e.currentTarget.style.background="#000"}
            onClick={() => onSignIn("apple")}
          >
            <svg width="16" height="18" viewBox="0 0 814 1000" fill="white">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-142.9-98.3C27.5 752.9 0 643 0 540.5c0-198.4 129.8-303.1 257.3-303.1 68.2 0 124.6 44.8 167.6 44.8 41 0 105.8-47.1 183.2-47.1z"/>
              <path d="M480.5 147.3c22.8-28.4 38.7-67.7 38.7-107 0-5.5-.5-11-1.5-15.4-36.7 1.4-80.2 24.6-106.2 56.5-21.4 26.1-40.3 65.4-40.3 105.3 0 6 1 12 1.5 14 2.5.5 6.5 1 10.5 1 33.2 0 73.2-22.2 97.3-54.4z"/>
            </svg>
            Continue with Apple
          </button>
        </div>
        {error && <p style={{ color:"#c0392b", fontSize:"12px", textAlign:"center", marginTop:"16px" }}>{error}</p>}
        <p style={{ color:"#8C7355", fontSize:"11px", textAlign:"center", marginTop:"24px", lineHeight:1.6 }}>
          Your data is private to your account and never shared.
        </p>
      </div>
    </div>
  );
}

function ApiKeyScreen({ onSave, existingKey }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const setupSteps = [
    {
      num: "1", label: "Create a free Anthropic account",
      detail: "Visit console.anthropic.com and sign up with your email and a password. You will need to verify with a phone number."
    },
    {
      num: "2", label: "Claim your free credits",
      detail: "After verifying your phone number, Anthropic gives new accounts $5 in free API credits — no payment method required. Each daily session costs about one cent, so $5 covers well over a year of daily use. Note: the free credits expire 14 days after your account is created, so start using the app within that window."
    },
    {
      num: "3", label: "Generate an API key",
      detail: "In the console, go to Settings then API Keys and click Create Key. Give it any name, then copy it immediately — it is only shown once."
    },
    {
      num: "4", label: "Paste it below and begin",
      detail: "Your key starts with sk-ant- and is saved to your account so you will not need to enter it again. Before closing the console, copy your key and store it somewhere safe — like a password manager or a private note on your phone — so you can access it in the future if needed."
    },
  ];

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      setError("That doesn't look like a valid Anthropic API key. It should start with sk-ant-");
      return;
    }
    onSave(trimmed);
  }

  return (
    <div style={ctr}>
      <Leaf style={{ position:"absolute", top:20, right:30, transform:"rotate(30deg)" }} />
      <div style={{ ...card, maxWidth:"660px" }}>
        <div style={bar} />
        <h2 style={{ color:"#3B2F1E", fontSize:"22px", fontWeight:"normal", textAlign:"center", margin:"0 0 6px" }}>One More Step</h2>
        <p style={{ color:"#8C7355", fontSize:"14px", textAlign:"center", marginBottom:"24px", lineHeight:1.6, fontStyle:"italic" }}>
          Mindful Moment uses your own Anthropic API key to generate reflections privately.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"22px" }}>
          {setupSteps.map(step => (
            <div key={step.num} style={{ display:"flex", gap:"14px", alignItems:"flex-start", background:"rgba(232,201,154,0.15)", border:"1px solid #E2D5C3", borderRadius:"10px", padding:"14px 16px" }}>
              <div style={{ minWidth:"26px", height:"26px", borderRadius:"50%", background:"linear-gradient(135deg, #C17F3E, #7A4F2D)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ color:"#FDF8F2", fontSize:"12px", fontWeight:"bold" }}>{step.num}</span>
              </div>
              <div>
                <p style={{ color:"#3B2F1E", fontSize:"13px", fontWeight:"bold", margin:"0 0 3px" }}>{step.label}</p>
                <p style={{ color:"#8C7355", fontSize:"12px", margin:0, lineHeight:1.6 }}>{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:"rgba(232,201,154,0.12)", border:"1px solid #E2D5C3", borderRadius:"10px", padding:"12px 16px", marginBottom:"20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
          <p style={{ color:"#8C7355", fontSize:"12px", margin:0 }}>Open the API Keys page:</p>
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
            style={{ color:"#C17F3E", fontSize:"13px", textDecoration:"none", borderBottom:"1px solid #E8C99A" }}>
            console.anthropic.com/settings/keys &#8599;
          </a>
        </div>
        <p style={{ color:"#3B2F1E", fontSize:"13px", marginBottom:"6px" }}>Paste your API key here:</p>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(""); }}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="sk-ant-..."
          style={{
            width:"100%", boxSizing:"border-box",
            padding:"12px 16px", fontSize:"14px", fontFamily:"monospace",
            background:"rgba(232,201,154,0.12)",
            border: error ? "1.5px solid #c0392b" : "1.5px solid #E2D5C3",
            borderRadius:"10px", color:"#3B2F1E", outline:"none", marginBottom:"6px",
          }}
        />
        {error
          ? <p style={{ color:"#c0392b", fontSize:"12px", margin:"2px 0 0" }}>{error}</p>
          : <p style={{ color:"#8C7355", fontSize:"11px", margin:"2px 0 0", lineHeight:1.5 }}>Your key is saved to your account and synced across all your devices.</p>
        }
        <div style={{ textAlign:"center", marginTop:"22px" }}>
          <button style={btn}
            onMouseEnter={e => { e.target.style.transform="translateY(-1px)"; e.target.style.boxShadow="0 6px 20px rgba(193,127,62,0.35)"; }}
            onMouseLeave={e => { e.target.style.transform=""; e.target.style.boxShadow="0 4px 16px rgba(193,127,62,0.25)"; }}
            onClick={handleSubmit}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}

function Calendar({ sessions, onSelectDay, onClose }) {
  const now = new Date();
  const [yr, setYr] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth());

  const monthLabel = new Date(yr, mo, 1).toLocaleDateString("en-US", { month:"long", year:"numeric" });
  const firstDow = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const prevMo = () => { if (mo === 0) { setMo(11); setYr(y=>y-1); } else setMo(m=>m-1); };
  const nextMo = () => { if (mo === 11) { setMo(0); setYr(y=>y+1); } else setMo(m=>m+1); };

  const countThisMo = cells.filter(d => {
    if (!d) return false;
    const k = `${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return !!sessions[k];
  }).length;

  return (
    <div style={ctr}>
      <Leaf style={{ position:"absolute", top:20, right:30, transform:"rotate(30deg)" }} />
      <div style={card}>
        <div style={bar} />
        <p style={{ color:"#8C7355", fontSize:"11px", letterSpacing:"0.18em", textTransform:"uppercase", textAlign:"center", marginBottom:"4px" }}>My Reflections</p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
          <button onClick={prevMo} style={{ ...ghost, padding:"8px 18px", fontSize:"20px", lineHeight:1 }}>&#8249;</button>
          <h2 style={{ color:"#3B2F1E", fontSize:"20px", fontWeight:"normal", margin:0 }}>{monthLabel}</h2>
          <button onClick={nextMo} style={{ ...ghost, padding:"8px 18px", fontSize:"20px", lineHeight:1 }}>&#8250;</button>
        </div>
        {countThisMo > 0 && (
          <p style={{ color:"#8C7355", fontSize:"12px", textAlign:"center", marginBottom:"16px", fontStyle:"italic" }}>
            {countThisMo} reflection{countThisMo !== 1 ? "s" : ""} completed this month
          </p>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:"4px", marginBottom:"8px" }}>
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
            <div key={d} style={{ textAlign:"center", fontSize:"11px", color:"#8C7355", letterSpacing:"0.08em", padding:"4px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:"4px", marginBottom:"28px" }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const k = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const sess = sessions[k];
            const isToday = k === todayKey();
            return (
              <div key={k} onClick={() => sess && onSelectDay(sess, k)}
                title={sess ? `View: ${sess.reading.title}` : ""}
                style={{
                  aspectRatio:"1", borderRadius:"10px",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  background: isToday ? "rgba(232,201,154,0.33)" : sess ? "rgba(232,201,154,0.19)" : "transparent",
                  border: isToday ? "1.5px solid #C17F3E" : sess ? "1px solid #E8C99A" : "1px solid transparent",
                  cursor: sess ? "pointer" : "default",
                  transition:"background 0.2s, transform 0.1s", padding:"2px",
                }}
                onMouseEnter={e => { if (sess) { e.currentTarget.style.background="rgba(232,201,154,0.4)"; e.currentTarget.style.transform="scale(1.08)"; }}}
                onMouseLeave={e => { if (sess) { e.currentTarget.style.background=isToday?"rgba(232,201,154,0.33)":"rgba(232,201,154,0.19)"; e.currentTarget.style.transform="scale(1)"; }}}
              >
                <span style={{ fontSize:"12px", color:isToday?"#C17F3E":"#3B2F1E", fontWeight:isToday?"bold":"normal", lineHeight:1.2 }}>{day}</span>
                {sess && <span style={{ fontSize:"11px", color:"#C17F3E", lineHeight:1 }}>&#10003;</span>}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign:"center" }}>
          <button style={ghost} onClick={onClose}>&#8592; Back to Home</button>
        </div>
      </div>
    </div>
  );
}

function PastSession({ session, dateKey, onClose }) {
  const [view, setView] = useState("reading");
  const [promptIdx, setPromptIdx] = useState(0);
  const r = session.reading;
  const dateLabel = new Date(dateKey + "T12:00:00").toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  const prompts = r.reflection_prompts || [];
  const isLast = promptIdx >= prompts.length - 1;

  return (
    <div style={ctr}>
      <Leaf style={{ position:"absolute", top:20, right:30, transform:"rotate(30deg)" }} />
      <div style={card}>
        <div style={bar} />
        <p style={{ color:"#8C7355", fontSize:"11px", letterSpacing:"0.14em", textTransform:"uppercase", textAlign:"center", marginBottom:"4px" }}>
          Past Reflection &middot; {dateLabel}
        </p>
        {view === "reading" && <>
          <p style={{ color:"#C17F3E", fontSize:"11px", letterSpacing:"0.2em", textTransform:"uppercase", textAlign:"center", marginBottom:"4px", marginTop:"14px" }}>{r.theme}</p>
          <h2 style={{ color:"#3B2F1E", fontSize:"22px", fontWeight:"normal", textAlign:"center", margin:"0 0 22px", fontStyle:"italic" }}>{r.title}</h2>
          <div style={{ background:"linear-gradient(135deg, rgba(232,201,154,0.19), rgba(232,201,154,0.09))", border:"1px solid #E8C99A", borderLeft:"4px solid #C17F3E", borderRadius:"10px", padding:"20px 22px", marginBottom:"18px" }}>
            <p style={{ color:"#3B2F1E", fontSize:"17px", lineHeight:1.75, margin:0, fontStyle:r.source_type==="quote"?"italic":"normal" }}>{r.content}</p>
            {r.attribution && <p style={{ color:"#8C7355", fontSize:"13px", margin:"10px 0 0", textAlign:"right" }}>&#8212; {r.attribution}</p>}
          </div>
          <p style={{ color:"#8C7355", fontSize:"14px", lineHeight:1.8, marginBottom:"28px" }}>{r.context}</p>
          <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
            <button style={ghost} onClick={onClose}>&#8592; Calendar</button>
            <button style={btn} onClick={() => { setView("reflect"); setPromptIdx(0); }}>Reflections &#8594;</button>
          </div>
        </>}
        {view === "reflect" && <>
          <p style={{ color:"#C17F3E", fontSize:"11px", letterSpacing:"0.2em", textTransform:"uppercase", textAlign:"center", marginTop:"14px", marginBottom:"16px" }}>
            Reflection &middot; {promptIdx+1} of {prompts.length}
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:"8px", marginBottom:"28px" }}>
            {prompts.map((_,i) => <div key={i} style={{ width:"8px", height:"8px", borderRadius:"50%", background:i<=promptIdx?"#C17F3E":"#E2D5C3" }} />)}
          </div>
          <div style={{ background:"rgba(232,201,154,0.15)", borderRadius:"12px", padding:"28px 24px", marginBottom:"28px", minHeight:"90px", display:"flex", alignItems:"center" }}>
            <p style={{ color:"#3B2F1E", fontSize:"19px", lineHeight:1.7, margin:0, fontStyle:"italic", textAlign:"center", width:"100%" }}>{prompts[promptIdx]}</p>
          </div>
          <p style={{ color:"#8C7355", fontSize:"13px", textAlign:"center", marginBottom:"22px", fontStyle:"italic" }}>Sit with this question.</p>
          <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
            <button style={ghost} onClick={() => promptIdx===0 ? setView("reading") : setPromptIdx(p=>p-1)}>&#8592; Back</button>
            <button style={btn} onClick={() => isLast ? setView("close") : setPromptIdx(p=>p+1)}>
              {isLast ? "Closing Intention \u2192" : "Next \u2192"}
            </button>
          </div>
        </>}
        {view === "close" && <>
          <div style={{ textAlign:"center", padding:"16px 0 28px" }}>
            <div style={{ fontSize:"32px", marginBottom:"16px" }}>&#127807;</div>
            <p style={{ color:"#C17F3E", fontSize:"11px", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:"16px" }}>Closing Intention</p>
            <p style={{ color:"#3B2F1E", fontSize:"20px", lineHeight:1.75, fontStyle:"italic" }}>&#8220;{r.closing_intention}&#8221;</p>
          </div>
          <hr style={{ border:"none", borderTop:"1px solid #E2D5C3", margin:"20px 0" }} />
          <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
            <button style={ghost} onClick={() => setView("reflect")}>&#8592; Back</button>
            <button style={ghost} onClick={onClose}>&#8592; Calendar</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sessions, setSessions] = useState({});
  const [dataLoading, setDataLoading] = useState(false);
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("welcome");
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [pastSession, setPastSession] = useState(null);

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setDataLoading(true);
        const data = await loadUserData(u.uid);
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.sessions) setSessions(data.sessions);
        setDataLoading(false);
      } else {
        setApiKey("");
        setSessions({});
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  async function handleSignIn(provider) {
    setAuthError("");
    try {
      await signInWithPopup(auth, provider === "google" ? googleProvider : appleProvider);
    } catch (e) {
      setAuthError("Sign in failed. Please try again.");
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  async function handleSaveApiKey(key) {
    setApiKey(key);
    await saveUserData(user.uid, { apiKey: key });
  }

  const today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });
  const alreadyDoneToday = !!sessions[todayKey()];

  async function fetchReading() {
    setLoading(true);
    setStep("reading");
    setRevealed(false);
    setCurrentPrompt(0);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role:"user", content:"Generate today's secular mindful devotional reading." }],
          system: buildSystemPrompt(sessions),
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.content.map(i => i.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setReading(parsed);
      setTimeout(() => setRevealed(true), 100);
    } catch (e) {
      setStep("welcome");
    }
    setLoading(false);
  }

  async function completeSession() {
    const updated = { ...sessions, [todayKey()]: { reading, completedAt: new Date().toISOString() } };
    setSessions(updated);
    await saveUserData(user.uid, { sessions: updated });
    setStep("welcome");
    setReading(null);
  }

  // ── Render gates ──────────────────────────────────────────────────
  if (authLoading || dataLoading) {
    return (
      <div style={ctr}>
        <div style={{ ...card, textAlign:"center" }}>
          <div style={bar} />
          <div style={{ fontSize:"32px", marginBottom:"16px", animation:"pulse 2s infinite" }}>&#127807;</div>
          <p style={{ color:"#8C7355", fontStyle:"italic", fontSize:"16px" }}>Loading&#8230;</p>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      </div>
    );
  }

  if (!user) return <SignInScreen onSignIn={handleSignIn} error={authError} />;
  if (!apiKey) return <ApiKeyScreen onSave={handleSaveApiKey} />;

  if (showCalendar && !pastSession) {
    return <Calendar sessions={sessions} onSelectDay={(sess,k) => setPastSession({session:sess,dateKey:k})} onClose={() => setShowCalendar(false)} />;
  }
  if (pastSession) {
    return <PastSession session={pastSession.session} dateKey={pastSession.dateKey} onClose={() => setPastSession(null)} />;
  }

  if (loading) {
    return (
      <div style={ctr}>
        <div style={{ ...card, textAlign:"center" }}>
          <div style={bar} />
          <div style={{ fontSize:"32px", marginBottom:"16px", animation:"pulse 2s infinite" }}>&#127807;</div>
          <p style={{ color:"#8C7355", fontStyle:"italic", fontSize:"16px" }}>Gathering today's reflection&#8230;</p>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      </div>
    );
  }

  if (step === "welcome") {
    const completedCount = Object.keys(sessions).length;
    return (
      <div style={ctr}>
        <Leaf style={{ position:"absolute", top:20, right:30, transform:"rotate(30deg)" }} />
        <Leaf style={{ position:"absolute", bottom:30, left:20, transform:"rotate(200deg)" }} />
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"4px" }}>
            <button style={{ ...ghost, fontSize:"11px", padding:"4px 12px", opacity:0.5 }} onClick={handleSignOut}>Sign out</button>
          </div>
          <div style={bar} />
          <p style={{ color:"#8C7355", fontSize:"12px", letterSpacing:"0.18em", textTransform:"uppercase", textAlign:"center", marginBottom:"8px" }}>{today}</p>
          <h1 style={{ color:"#3B2F1E", fontSize:"32px", fontWeight:"normal", textAlign:"center", margin:"0 0 6px", letterSpacing:"-0.01em" }}>Mindful Moment</h1>
          <p style={{ color:"#8C7355", fontSize:"15px", textAlign:"center", marginBottom:"28px", lineHeight:1.6, fontStyle:"italic" }}>
            A quiet space for reflection.<br />Ten minutes, once a day.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"24px" }}>
            {["Ancient wisdom","Eastern thought","Science & nature","Philosophy","History","Literature"].map(t => (
              <div key={t} style={{ background:"rgba(232,201,154,0.27)", border:"1px solid #E2D5C3", borderRadius:"8px", padding:"8px", textAlign:"center", fontSize:"11px", color:"#8C7355", letterSpacing:"0.04em" }}>{t}</div>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px" }}>
            {alreadyDoneToday ? (
              <div style={{ textAlign:"center" }}>
                <p style={{ fontSize:"28px", marginBottom:"6px" }}>&#10003;</p>
                <p style={{ color:"#C17F3E", fontSize:"15px", fontStyle:"italic", marginBottom:"14px" }}>You have completed today's reflection.</p>
                <button style={ghost} onClick={() => setPastSession({ session:sessions[todayKey()], dateKey:todayKey() })}>
                  Revisit Today's Session
                </button>
              </div>
            ) : (
              <button style={btn}
                onMouseEnter={e => { e.target.style.transform="translateY(-1px)"; e.target.style.boxShadow="0 6px 20px rgba(193,127,62,0.35)"; }}
                onMouseLeave={e => { e.target.style.transform=""; e.target.style.boxShadow="0 4px 16px rgba(193,127,62,0.25)"; }}
                onClick={fetchReading}>
                Begin Today's Reading
              </button>
            )}
            {completedCount > 0 && (
              <button style={ghost} onClick={() => setShowCalendar(true)}>
                &#128197; My Sessions ({completedCount})
              </button>
            )}
            <button style={{ ...ghost, fontSize:"12px", padding:"8px 18px", opacity:0.6 }}
              onClick={() => handleSaveApiKey("").then(() => setApiKey(""))}>
              Change API Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reading) return null;

  if (step === "reading") {
    return (
      <div style={ctr}>
        <Leaf style={{ position:"absolute", top:20, right:30, transform:"rotate(30deg)" }} />
        <div style={{ ...card, opacity:revealed?1:0, transform:revealed?"translateY(0)":"translateY(16px)", transition:"opacity 0.7s ease, transform 0.7s ease" }}>
          <div style={bar} />
          <p style={{ color:"#C17F3E", fontSize:"11px", letterSpacing:"0.2em", textTransform:"uppercase", textAlign:"center", marginBottom:"4px" }}>{reading.theme}</p>
          <h2 style={{ color:"#3B2F1E", fontSize:"24px", fontWeight:"normal", textAlign:"center", margin:"0 0 28px", fontStyle:"italic" }}>{reading.title}</h2>
          <div style={{ background:"linear-gradient(135deg, rgba(232,201,154,0.19), rgba(232,201,154,0.09))", border:"1px solid #E8C99A", borderLeft:"4px solid #C17F3E", borderRadius:"10px", padding:"22px 24px", marginBottom:"20px" }}>
            <p style={{ color:"#3B2F1E", fontSize:"18px", lineHeight:1.75, margin:0, fontStyle:reading.source_type==="quote"?"italic":"normal" }}>{reading.content}</p>
            {reading.attribution && <p style={{ color:"#8C7355", fontSize:"13px", margin:"12px 0 0", textAlign:"right" }}>&#8212; {reading.attribution}</p>}
          </div>
          <p style={{ color:"#8C7355", fontSize:"15px", lineHeight:1.8, marginBottom:"32px" }}>{reading.context}</p>
          <div style={{ textAlign:"center" }}>
            <button style={btn}
              onMouseEnter={e => e.target.style.transform="translateY(-1px)"}
              onMouseLeave={e => e.target.style.transform=""}
              onClick={() => { setStep("reflect"); setCurrentPrompt(0); }}>
              Continue to Reflection &#8594;
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "reflect") {
    const prompts = reading.reflection_prompts || [];
    const isLast = currentPrompt >= prompts.length - 1;
    return (
      <div style={ctr}>
        <div style={card}>
          <div style={bar} />
          <p style={{ color:"#C17F3E", fontSize:"11px", letterSpacing:"0.2em", textTransform:"uppercase", textAlign:"center", marginBottom:"20px" }}>
            Reflection &middot; {currentPrompt+1} of {prompts.length}
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:"8px", marginBottom:"32px" }}>
            {prompts.map((_,i) => <div key={i} style={{ width:"8px", height:"8px", borderRadius:"50%", background:i<=currentPrompt?"#C17F3E":"#E2D5C3", transition:"background 0.3s" }} />)}
          </div>
          <div style={{ background:"rgba(232,201,154,0.15)", borderRadius:"12px", padding:"32px 28px", marginBottom:"32px", minHeight:"100px", display:"flex", alignItems:"center" }}>
            <p style={{ color:"#3B2F1E", fontSize:"20px", lineHeight:1.7, margin:0, fontStyle:"italic", textAlign:"center", width:"100%" }}>{prompts[currentPrompt]}</p>
          </div>
          <p style={{ color:"#8C7355", fontSize:"13px", textAlign:"center", marginBottom:"24px", fontStyle:"italic" }}>Sit with this question.</p>
          <div style={{ display:"flex", justifyContent:"center", gap:"12px" }}>
            {currentPrompt > 0 && <button style={ghost} onClick={() => setCurrentPrompt(p=>p-1)}>&#8592; Back</button>}
            <button style={btn}
              onMouseEnter={e => e.target.style.transform="translateY(-1px)"}
              onMouseLeave={e => e.target.style.transform=""}
              onClick={() => isLast ? setStep("close") : setCurrentPrompt(p=>p+1)}>
              {isLast ? "Closing Intention \u2192" : "Next Question \u2192"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "close") {
    return (
      <div style={ctr}>
        <Leaf style={{ position:"absolute", bottom:30, left:20, transform:"rotate(200deg)" }} />
        <div style={card}>
          <div style={bar} />
          <p style={{ color:"#C17F3E", fontSize:"11px", letterSpacing:"0.2em", textTransform:"uppercase", textAlign:"center", marginBottom:"20px" }}>Today's Intention</p>
          <div style={{ textAlign:"center", padding:"20px 0 32px" }}>
            <div style={{ fontSize:"36px", marginBottom:"20px" }}>&#127807;</div>
            <p style={{ color:"#3B2F1E", fontSize:"22px", lineHeight:1.75, fontStyle:"italic", margin:"0 0 12px" }}>&#8220;{reading.closing_intention}&#8221;</p>
            <p style={{ color:"#8C7355", fontSize:"13px", marginTop:"20px" }}>Carry this with you today.</p>
          </div>
          <hr style={{ border:"none", borderTop:"1px solid #E2D5C3", margin:"24px 0" }} />
          <div style={{ display:"flex", justifyContent:"center", gap:"12px", flexWrap:"wrap" }}>
            <button style={ghost}
              onClick={() => { setStep("reading"); setRevealed(false); setTimeout(() => setRevealed(true), 50); }}>
              &#8592; Re-read
            </button>
            <button style={btn}
              onMouseEnter={e => e.target.style.transform="translateY(-1px)"}
              onMouseLeave={e => e.target.style.transform=""}
              onClick={completeSession}>
              Done for Today &#10003;
            </button>
          </div>
        </div>
      </div>
    );
  }
}
