import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Bell, Check, CheckCircle2, ChevronDown, Clock3,
  ClipboardList, Headset, LayoutDashboard, ListChecks, LogOut, Menu,
  Monitor, Plus, RefreshCw, Search, ShieldCheck, SkipForward, Sparkles,
  Ticket, Users, X
} from "lucide-react";

const API = "http://localhost:5000/api";
const moneyTime = (minutes) => minutes <= 0 ? "Almost your turn" : `~${minutes} min`;

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

function App() {
  const [mode, setMode] = useState("user");
  const [services, setServices] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState({ total: 0, waiting: 0, serving: 0, completed: 0 });
  const [selectedService, setSelectedService] = useState("general");
  const [customerName, setCustomerName] = useState("");
  const [myToken, setMyToken] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await request("/queue");
      setServices(data.services);
      setTokens(data.tokens);
      setStats(data.stats);
      setError("");
    } catch (err) {
      setError("Cannot connect to the backend. Start the server terminal and refresh.");
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  const activeTokens = useMemo(() => tokens.filter(t => ["waiting", "serving"].includes(t.status)), [tokens]);
  const visibleTokens = useMemo(() => {
    return tokens.filter(token => {
      const matchesFilter = filter === "all" || token.status === filter;
      const q = search.toLowerCase();
      const matchesSearch = !q || token.tokenNumber.toLowerCase().includes(q) || token.serviceName.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [tokens, filter, search]);

  const selectedQueue = services.find(s => s.id === selectedService);
  const myPosition = myToken ? tokens.filter(t => t.serviceId === myToken.serviceId && t.status === "waiting" && new Date(t.createdAt) < new Date(myToken.createdAt)).length : 0;
  const currentlyServing = myToken ? services.find(s => s.id === myToken.serviceId)?.serving : null;
  const ahead = myToken?.status === "serving" ? 0 : myPosition + (currentlyServing ? 1 : 0);
  const estimate = myToken ? ahead * (selectedQueue?.avgMinutes || services.find(s => s.id === myToken.serviceId)?.avgMinutes || 5) : 0;

  async function generateToken(event) {
    event.preventDefault();
    setBusy(true); setNotice(""); setError("");
    try {
      const data = await request("/tokens", {
        method: "POST",
        body: JSON.stringify({ serviceId: selectedService, customerName })
      });
      setMyToken(data.token);
      setNotice(`${data.token.tokenNumber} generated successfully.`);
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function performAction(token, action) {
    setBusy(true); setNotice(""); setError("");
    try {
      const data = await request(`/tokens/${token.id}/${action}`, { method: "PATCH" });
      setNotice(data.message);
      if (myToken?.id === token.id) setMyToken(data.token);
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const servingToken = services.find(s => s.id === selectedService)?.serving;
  const nextWaiting = tokens.find(t => t.serviceId === selectedService && t.status === "waiting");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><strong>QueueWise</strong><span>SMART QUEUE SYSTEM</span></div></div>
        <div className="side-label">WORKSPACE</div>
        <button className={`nav-link ${mode === "user" ? "active" : ""}`} onClick={() => setMode("user")}><Ticket size={18}/> User portal</button>
        <button className={`nav-link ${mode === "admin" ? "active" : ""}`} onClick={() => setMode("admin")}><LayoutDashboard size={18}/> Admin dashboard</button>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><Headset size={18}/></div><strong>Need assistance?</strong><p>QueueWise helps you spend less time waiting.</p></div>
          <div className="profile"><div className="avatar">Q</div><div><strong>QueueWise Demo</strong><span>Local demonstration</span></div><ChevronDown size={16}/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{mode === "user" ? "User portal" : "Admin dashboard"}</strong></div>
          <div className="top-actions"><span className="live-dot"></span><span className="live-text">System online</span><button className="icon-button" title="Refresh queue" onClick={refresh}><RefreshCw size={17}/></button><div className="top-avatar">Q</div></div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div><div className="eyebrow"><Sparkles size={14}/> DIGITAL QUEUE MANAGEMENT</div><h1>{mode === "user" ? "Skip the line. Keep your time." : "Queue operations overview"}</h1><p>{mode === "user" ? "Join a service queue digitally and follow your turn from wherever you are." : "Manage service counters, call tokens and keep every queue moving."}</p></div>
            <div className="date-chip"><Clock3 size={15}/> Live queue updates</div>
          </section>

          {error && <div className="alert error"><X size={17}/>{error}</div>}
          {notice && <div className="alert success"><CheckCircle2 size={17}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}

          {mode === "user" ? (
            <>
              <div className="stats-grid user-stats">
                <Stat icon={<Users/>} label="People waiting" value={stats.waiting} tone="blue"/>
                <Stat icon={<Activity/>} label="Currently serving" value={stats.serving} tone="purple"/>
                <Stat icon={<CheckCircle2/>} label="Completed today" value={stats.completed} tone="green"/>
              </div>
              <div className="user-layout">
                <section className="panel join-panel">
                  <div className="panel-heading"><div><span className="section-kicker">GET STARTED</span><h2>Join a queue</h2><p>Choose the service you need to receive a digital token.</p></div><div className="heading-icon"><Plus size={20}/></div></div>
                  <form onSubmit={generateToken}>
                    <label htmlFor="customer">Your name <span className="optional">OPTIONAL</span></label>
                    <input id="customer" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter your name"/>
                    <label>Select a service</label>
                    <div className="service-options">
                      {services.map(service => <button type="button" key={service.id} className={`service-option ${selectedService === service.id ? "chosen" : ""}`} onClick={() => setSelectedService(service.id)}>
                        <span className={`service-icon ${service.color}`}><ClipboardList size={19}/></span><span className="service-copy"><strong>{service.name}</strong><small>{service.description}</small></span><span className="service-wait">{service.avgMinutes} min</span>
                      </button>)}
                    </div>
                    <button className="primary-button full" disabled={busy || !services.length}><Ticket size={17}/> {busy ? "Generating..." : "Generate my token"} <ArrowRight size={17}/></button>
                    <div className="privacy-note"><ShieldCheck size={14}/> Your token is created instantly. No physical line required.</div>
                  </form>
                </section>

                <section className="right-column">
                  <div className="panel current-panel">
                    <div className="panel-heading compact"><div><span className="section-kicker">YOUR TICKET</span><h2>Queue status</h2></div><span className="status-pill"><span/> LIVE</span></div>
                    {myToken ? <div className="ticket-content">
                      <div className="ticket-number"><span>YOUR TOKEN</span><strong>{myToken.tokenNumber}</strong><small>{myToken.serviceName}</small></div>
                      <div className="ticket-metrics"><div><strong>{myToken.status === "completed" ? "Done" : myToken.status === "serving" ? "Now" : ahead}</strong><span>{myToken.status === "completed" ? "Status" : myToken.status === "serving" ? "Your turn" : "People ahead"}</span></div><div><strong>{myToken.status === "completed" ? "—" : moneyTime(estimate)}</strong><span>Estimated wait</span></div></div>
                      <div className="ticket-status"><span className={`status-dot ${myToken.status}`}></span><span>{myToken.status.charAt(0).toUpperCase() + myToken.status.slice(1)}</span><small>Updates automatically</small></div>
                    </div> : <div className="empty-ticket"><div className="empty-icon"><Ticket size={25}/></div><strong>No active ticket yet</strong><p>Generate a token to see your queue position and estimated wait time here.</p></div>}
                  </div>
                  <div className="tip-card"><div className="tip-icon"><Bell size={18}/></div><div><strong>Stay updated</strong><p>Keep this page open. Your queue position refreshes automatically every few seconds.</p></div></div>
                  <div className="panel mini-queue"><div className="panel-heading compact"><div><span className="section-kicker">SERVICE STATUS</span><h2>Now serving</h2></div><Monitor size={19} className="muted-icon"/></div>
                    {services.slice(0, 3).map(s => <div className="serving-row" key={s.id}><span>{s.name}</span><strong>{s.serving?.tokenNumber || "—"}</strong></div>)}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="stats-grid">
                <Stat icon={<Ticket/>} label="Total tokens" value={stats.total} tone="blue"/>
                <Stat icon={<Clock3/>} label="Waiting" value={stats.waiting} tone="amber"/>
                <Stat icon={<Activity/>} label="Being served" value={stats.serving} tone="purple"/>
                <Stat icon={<CheckCircle2/>} label="Completed" value={stats.completed} tone="green"/>
              </div>
              <div className="admin-layout">
                <section className="panel control-panel">
                  <div className="panel-heading"><div><span className="section-kicker">COUNTER CONTROL</span><h2>Manage service queue</h2><p>Select a service counter to manage its tokens.</p></div><div className="heading-icon"><ListChecks size={20}/></div></div>
                  <label>Select service</label>
                  <div className="select-wrap"><select value={selectedService} onChange={e => setSelectedService(e.target.value)}>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><ChevronDown size={16}/></div>
                  <div className="counter-display"><span>CURRENTLY SERVING</span><strong>{servingToken?.tokenNumber || "— — —"}</strong><small>{servingToken ? servingToken.customerName : "No token is currently being served"}</small></div>
                  <div className="next-up"><div><span>NEXT IN LINE</span><strong>{nextWaiting?.tokenNumber || "No waiting tokens"}</strong></div><span className="queue-count">{services.find(s => s.id === selectedService)?.waitingCount || 0} waiting</span></div>
                  <button className="primary-button full" disabled={busy || !nextWaiting || !!servingToken} onClick={() => performAction(nextWaiting, "serve")}><Activity size={17}/> Call next token <ArrowRight size={17}/></button>
                  <div className="secondary-actions">
                    <button className="secondary-button" disabled={busy || !servingToken} onClick={() => performAction(servingToken, "complete")}><Check size={16}/> Complete</button>
                    <button className="secondary-button" disabled={busy || !(servingToken || nextWaiting)} onClick={() => performAction(servingToken || nextWaiting, "skip")}><SkipForward size={16}/> Skip token</button>
                  </div>
                </section>
                <section className="panel queue-panel">
                  <div className="panel-heading table-heading"><div><span className="section-kicker">QUEUE MONITOR</span><h2>Token management</h2></div><span className="count-badge">{tokens.length} total</span></div>
                  <div className="table-tools"><div className="search-box"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search token or service"/></div><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All status</option><option value="waiting">Waiting</option><option value="serving">Serving</option><option value="completed">Completed</option><option value="skipped">Skipped</option></select></div>
                  <div className="table-scroll"><table><thead><tr><th>TOKEN</th><th>SERVICE</th><th>NAME</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
                    {visibleTokens.length ? visibleTokens.map(token => <tr key={token.id}><td className="token-cell">{token.tokenNumber}</td><td>{token.serviceName}</td><td>{token.customerName}</td><td><span className={`table-status ${token.status}`}>{token.status}</span></td><td>{token.status === "waiting" ? <button className="text-action" disabled={busy || !!services.find(s => s.id === token.serviceId)?.serving} onClick={() => performAction(token, "serve")}>Call</button> : token.status === "serving" ? <button className="text-action" disabled={busy} onClick={() => performAction(token, "complete")}>Complete</button> : <span className="muted-dash">—</span>}</td></tr>) : <tr><td colSpan="5" className="no-results">No tokens match your search.</td></tr>}
                  </tbody></table></div>
                  <div className="table-footer"><span>Auto-refreshes every 4 seconds</span><button onClick={refresh}><RefreshCw size={13}/> Refresh</button></div>
                </section>
              </div>
            </>
          )}
          <footer className="footer"><span>© 2026 QueueWise</span><span>Digital queue management · Built for better service experiences</span></footer>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div><div className="stat-trend"><Activity size={15}/></div></div>;
}

export default App;
