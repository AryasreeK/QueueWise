import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ClipboardList,
  Headset,
  LayoutDashboard,
  ListChecks,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Ticket,
  Users,
  X,
  LogOut,
  LockKeyhole,
  UserPlus,
  BarChart3,
  Settings2,
} from "lucide-react";

import ServiceManagement from "./ServiceManagement";
import Analytics from "./Analytics";
import QueueConfiguration from "./QueueConfiguration";
import SupportCentre from "./SupportCentre";
import TokenActivityHistory from "./TokenActivityHistory";

const API = "http://localhost:5000/api";
const TOKEN_KEY = "queuewise_auth_token";
const MY_TOKEN_KEY = "queuewise_my_token_id";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

const moneyTime = (minutes) =>
  minutes <= 0 ? "Almost your turn" : `~${minutes} min`;

const isAdminRole = (role) => ["superadmin", "admin", "staff"].includes(role);

function AuthScreen({ onAuthenticated }) {
  const [screen, setScreen] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const endpoint = screen === "login" ? "/auth/login" : "/auth/register";

      const body =
        screen === "login" ? { email, password } : { name, email, password };

      const data = await request(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      localStorage.setItem(TOKEN_KEY, data.token);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qw-auth-page">
      <style>{`
        .qw-auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: linear-gradient(135deg,#edf3ff,#f7f8fc 55%,#eef2ff);
        }
        .qw-auth-card {
          width: 100%;
          max-width: 430px;
          background: white;
          padding: 34px;
          border: 1px solid #e5eaf3;
          border-radius: 18px;
          box-shadow: 0 18px 55px #23395b14;
        }
        .qw-auth-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 30px;
        }
        .qw-auth-logo {
          width: 45px;
          height: 45px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(135deg,#3d83f6,#5d65e8);
        }
        .qw-auth-brand strong {
          display: block;
          font: 800 21px Manrope,sans-serif;
          color: #17243b;
        }
        .qw-auth-brand span {
          display: block;
          font-size: 9px;
          letter-spacing: 1.3px;
          color: #8b99af;
          margin-top: 3px;
        }
        .qw-auth-card h1 {
          font: 800 25px Manrope,sans-serif;
          color: #17243b;
          margin: 0 0 7px;
        }
        .qw-auth-subtitle {
          color: #8290a5;
          font-size: 12px;
          line-height: 1.6;
          margin: 0 0 23px;
        }
        .qw-auth-card label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #48566e;
          margin: 15px 0 7px;
        }
        .qw-auth-card input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          outline: none;
          font-size: 12px;
          color: #34435b;
        }
        .qw-auth-card input:focus {
          border-color: #86a8f5;
          box-shadow: 0 0 0 3px #edf3ff;
        }
        .qw-auth-submit {
          width: 100%;
          border: 0;
          border-radius: 8px;
          padding: 13px;
          margin-top: 22px;
          background: linear-gradient(100deg,#477ee8,#5d6ee0);
          color: white;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .qw-auth-submit:disabled {
          opacity: .6;
          cursor: wait;
        }
        .qw-auth-switch {
          border: 0;
          background: transparent;
          color: #527bd0;
          font-size: 11px;
          font-weight: 700;
          margin-top: 19px;
          width: 100%;
        }
        .qw-auth-error {
          background: #fff0ef;
          border: 1px solid #ffd9d6;
          color: #bd514b;
          border-radius: 8px;
          padding: 10px;
          font-size: 11px;
          margin-top: 14px;
        }
        .qw-auth-foot {
          text-align: center;
          color: #a1adbd;
          font-size: 10px;
          margin-top: 24px;
        }
      `}</style>

      <div className="qw-auth-card">
        <div className="qw-auth-brand">
          <div className="qw-auth-logo">
            <Activity size={23} />
          </div>
          <div>
            <strong>QueueWise</strong>
            <span>SMART QUEUE MANAGEMENT</span>
          </div>
        </div>

        <h1>{screen === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="qw-auth-subtitle">
          {screen === "login"
            ? "Sign in to access your QueueWise account."
            : "Register to create a QueueWise user account."}
        </p>

        <form onSubmit={submit}>
          {screen === "register" && (
            <>
              <label htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={80}
                required
              />
            </>
          )}

          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete={
              screen === "login" ? "current-password" : "new-password"
            }
            minLength={8}
            maxLength={72}
            required
          />

          {error && <div className="qw-auth-error">{error}</div>}

          <button className="qw-auth-submit" disabled={busy}>
            {screen === "login" ? (
              <LockKeyhole size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {busy
              ? "Please wait..."
              : screen === "login"
                ? "Sign in"
                : "Create account"}
            <ArrowRight size={16} />
          </button>
        </form>

        <button
          className="qw-auth-switch"
          onClick={() => {
            setScreen(screen === "login" ? "register" : "login");
            setError("");
          }}
        >
          {screen === "login"
            ? "New to QueueWise? Create an account"
            : "Already registered? Sign in"}
        </button>

        <div className="qw-auth-foot">
          QueueWise · Digital Queue Management System
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="stat-trend">
        <Activity size={15} />
      </div>
    </div>
  );
}

function StaffManagement() {
  const [members, setMembers] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTeam() {
    setLoading(true);
    setError("");

    try {
      const [teamData, serviceData] = await Promise.all([
        request("/team"),
        request("/services"),
      ]);

      setMembers(teamData.members || []);
      setAvailableServices(serviceData || []);

      const drafts = {};
      (teamData.members || []).forEach((member) => {
        drafts[member.id] = member.assignedServices || [];
      });

      setAssignments(drafts);
    } catch (err) {
      setError(err.message || "Could not load team members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function createAccount(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const data = await request("/auth/create-staff", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      setMessage(data.message || "Account created successfully.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");

      await loadTeam();
    } catch (err) {
      setError(err.message || "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(member) {
    setMessage("");
    setError("");

    try {
      const data = await request(`/team/${member.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: !member.active }),
      });

      setMembers((previous) =>
        previous.map((item) => (item.id === member.id ? data.member : item)),
      );

      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleAssignment(memberId, serviceId) {
    setAssignments((previous) => {
      const current = previous[memberId] || [];

      const updated = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];

      return {
        ...previous,
        [memberId]: updated,
      };
    });
  }

  async function saveAssignments(member) {
    setMessage("");
    setError("");

    try {
      const data = await request(`/team/${member.id}/assignments`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedServices: assignments[member.id] || [],
        }),
      });

      setMembers((previous) =>
        previous.map((item) => (item.id === member.id ? data.member : item)),
      );

      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredMembers = members.filter((member) => {
    const query = search.toLowerCase();

    const matchesSearch =
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query);

    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && member.active) ||
      (statusFilter === "inactive" && !member.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalAdmins = members.filter(
    (member) => member.role === "admin",
  ).length;

  const totalStaff = members.filter((member) => member.role === "staff").length;

  const activeMembers = members.filter((member) => member.active).length;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <section className="panel" style={{ padding: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="section-kicker">TEAM OVERVIEW</span>
            <h2>Team Management</h2>
            <p>Manage accounts, access and Staff service assignments.</p>
          </div>
          <div className="heading-icon">
            <Users size={20} />
          </div>
        </div>

        <div className="stats-grid">
          <Stat
            icon={<Users />}
            label="Total members"
            value={members.length}
            tone="blue"
          />
          <Stat
            icon={<ShieldCheck />}
            label="Administrators"
            value={totalAdmins}
            tone="purple"
          />
          <Stat
            icon={<Activity />}
            label="Staff"
            value={totalStaff}
            tone="amber"
          />
          <Stat
            icon={<CheckCircle2 />}
            label="Active accounts"
            value={activeMembers}
            tone="green"
          />
        </div>

        {message && (
          <div className="alert success">
            <CheckCircle2 size={17} /> {message}
          </div>
        )}

        {error && (
          <div className="alert error">
            <X size={17} /> {error}
          </div>
        )}

        <div className="panel-heading" style={{ marginTop: 25 }}>
          <div>
            <span className="section-kicker">MEMBER DIRECTORY</span>
            <h2>Team members</h2>
            <p>Search and manage existing Admin and Staff accounts.</p>
          </div>

          <button className="secondary-button" onClick={loadTeam}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <div className="table-tools" style={{ marginTop: 16 }}>
          <div className="search-box">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <p>Loading team members...</p>
        ) : filteredMembers.length === 0 ? (
          <p style={{ padding: 20, color: "#8290a5" }}>
            No team members match your search.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                style={{
                  border: "1px solid #e5eaf2",
                  borderRadius: 12,
                  padding: 18,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>{member.name}</strong>
                    <p
                      style={{
                        margin: "5px 0",
                        color: "#8290a5",
                        fontSize: 12,
                      }}
                    >
                      {member.email}
                    </p>
                    <span className="section-kicker">
                      {member.role.toUpperCase()}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        color: member.active ? "#16834a" : "#bd514b",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {member.active ? "ACTIVE" : "INACTIVE"}
                    </span>

                    <button
                      className="secondary-button"
                      onClick={() => changeStatus(member)}
                    >
                      {member.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>

                {member.role === "staff" && (
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 15,
                      borderTop: "1px solid #edf0f5",
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>Assigned services</strong>

                    <p
                      style={{
                        fontSize: 12,
                        color: "#8290a5",
                        margin: "5px 0 12px",
                      }}
                    >
                      Select the queues this Staff member is allowed to operate.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {availableServices.map((service) => (
                        <label
                          key={service.id}
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            fontSize: 12,
                            color: "#48566e",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={(assignments[member.id] || []).includes(
                              service.id,
                            )}
                            onChange={() =>
                              toggleAssignment(member.id, service.id)
                            }
                          />
                          {service.name}
                        </label>
                      ))}
                    </div>

                    <button
                      className="primary-button"
                      style={{ marginTop: 14 }}
                      onClick={() => saveAssignments(member)}
                    >
                      Save service assignments
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel" style={{ maxWidth: 760, padding: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="section-kicker">USER ACCESS CONTROL</span>
            <h2>Create team account</h2>
            <p>Create administrator and staff accounts for QueueWise.</p>
          </div>

          <div className="heading-icon">
            <UserPlus size={20} />
          </div>
        </div>

        <form
          onSubmit={createAccount}
          style={{ display: "grid", gap: 12, maxWidth: 480 }}
        >
          <label htmlFor="team-name">Full name</label>
          <input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            maxLength={80}
            required
          />

          <label htmlFor="team-email">Email address</label>
          <input
            id="team-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />

          <label htmlFor="team-password">Temporary password</label>
          <input
            id="team-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            maxLength={72}
            required
          />

          <label htmlFor="team-role">Account role</label>
          <select
            id="team-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <button className="primary-button" disabled={busy}>
            <UserPlus size={16} />
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [mode, setMode] = useState("user");

  const [services, setServices] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    serving: 0,
    completed: 0,
  });

  const [selectedService, setSelectedService] = useState("general");
  const [customerName, setCustomerName] = useState("");
  const [myToken, setMyToken] = useState(null);
  const [newRecoveryPin, setNewRecoveryPin] = useState("");
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [recoveryTokenNumber, setRecoveryTokenNumber] = useState("");
  const [recoveryPinInput, setRecoveryPinInput] = useState("");
  const [cancelPinInput, setCancelPinInput] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [visibleTokenLimit, setVisibleTokenLimit] = useState(10);

  const refresh = useCallback(async () => {
    try {
      const data = await request("/queue");
      setServices(data.services || []);
      setTokens(data.tokens || []);
      setStats(
        data.stats || {
          total: 0,
          waiting: 0,
          serving: 0,
          completed: 0,
        },
      );

      const savedId = localStorage.getItem(MY_TOKEN_KEY);
      if (savedId) {
        const saved = (data.tokens || []).find((token) => token.id === savedId);
        if (saved) {
          setMyToken(saved);
        } else {
          localStorage.removeItem(MY_TOKEN_KEY);
          setMyToken(null);
        }
      }
    } catch (err) {
      console.error("Queue refresh failed:", err);
      setError(
        "Cannot connect to QueueWise. Check that the backend is running.",
      );
    }
  }, []);

  // Keep Staff's selected service within their assigned services.
  useEffect(() => {
    if (
      user?.role === "staff" &&
      services.length > 0 &&
      !services.some((service) => service.id === selectedService)
    ) {
      setSelectedService(services[0].id);
    }
  }, [user, services, selectedService]);

  // Restore the login session when the page opens.
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        if (active) setAuthReady(true);
        return;
      }

      try {
        const data = await request("/auth/me");
        if (active) setUser(data.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (active) setUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  const visibleTokens = useMemo(() => {
    return tokens.filter((token) => {
      const matchesFilter = filter === "all" || token.status === filter;
      const query = search.toLowerCase();

      const matchesSearch =
        !query ||
        token.tokenNumber.toLowerCase().includes(query) ||
        token.serviceName.toLowerCase().includes(query) ||
        (token.customerName || "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [tokens, filter, search]);

  // Reset the displayed ticket count when search or filter changes.
  useEffect(() => {
    setVisibleTokenLimit(10);
  }, [filter, search]);

  const displayedTokens = visibleTokens.slice(0, visibleTokenLimit);

  const selectedQueue = services.find(
    (service) => service.id === selectedService,
  );

  const myService = myToken
    ? services.find((service) => service.id === myToken.serviceId)
    : null;

  const myPosition =
    myToken?.status === "waiting"
      ? Math.max(
          0,
          myService?.waiting?.findIndex((token) => token.id === myToken.id) ??
            0,
        )
      : 0;

  const currentlyServing = myService?.serving || null;
  const ahead =
    myToken?.status === "waiting" ? myPosition + (currentlyServing ? 1 : 0) : 0;

  const estimate = myToken ? ahead * (myService?.avgMinutes || 5) : 0;

  const servingToken = selectedQueue?.serving || null;
  const nextWaiting = selectedQueue?.waiting?.[0] || null;

  async function generateToken(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");

    try {
      const data = await request("/tokens", {
        method: "POST",
        body: JSON.stringify({
          serviceId: selectedService,
          customerName,
        }),
      });

      localStorage.setItem(MY_TOKEN_KEY, data.token.id);
      setMyToken(data.token);
      setNewRecoveryPin(data.recoveryPin || "");
      setCancelPinInput("");
      setNotice(
        `${data.token.tokenNumber} generated successfully. Save your recovery PIN now.`,
      );
      setCustomerName("");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function recoverTicket(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");

    try {
      const data = await request("/tokens/recover", {
        method: "POST",
        body: JSON.stringify({
          tokenNumber: recoveryTokenNumber.trim().toUpperCase(),
          recoveryPin: recoveryPinInput.trim(),
        }),
      });

      localStorage.setItem(MY_TOKEN_KEY, data.token.id);
      setMyToken(data.token);
      setNewRecoveryPin("");
      setShowRecoveryForm(false);
      setRecoveryTokenNumber("");
      setRecoveryPinInput("");
      setCancelPinInput("");
      setNotice(`${data.token.tokenNumber} recovered successfully.`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelMyTicket(event) {
    event.preventDefault();
    if (!myToken?.id) return;

    setBusy(true);
    setNotice("");
    setError("");

    try {
      const data = await request(`/tokens/${myToken.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ recoveryPin: cancelPinInput.trim() }),
      });

      setMyToken(data.token);
      setCancelPinInput("");
      setNewRecoveryPin("");
      setNotice(data.message);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function performAction(token, action) {
    if (!token?.id) return;

    if (!user || !isAdminRole(user.role)) {
      setError("Please sign in with an authorised staff account.");
      return;
    }

    setBusy(true);
    setNotice("");
    setError("");

    try {
      const data = await request(`/tokens/${token.id}/${action}`, {
        method: "PATCH",
      });

      setNotice(data.message);
      if (myToken?.id === token.id) setMyToken(data.token);
      await refresh();
    } catch (err) {
      setError(err.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleAuthenticated(authenticatedUser) {
    setUser(authenticatedUser);
    setMode("user");
    setNotice(`Welcome, ${authenticatedUser.name}.`);
    setError("");
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setMode("user");
    setNotice("You have been signed out.");
    setError("");
  }

  if (!authReady) {
    return (
      <div className="qw-auth-page">
        <p>Checking your QueueWise session...</p>
      </div>
    );
  }

  return (
    <>
      {!user && mode === "login" ? (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-mark">
                <Activity size={21} />
              </div>
              <div>
                <strong>QueueWise</strong>
                <span>SMART QUEUE SYSTEM</span>
              </div>
            </div>

            <div className="side-label">WORKSPACE</div>

            <button
              className={`nav-link ${mode === "user" ? "active" : ""}`}
              onClick={() => setMode("user")}
            >
              <Ticket size={18} /> User portal
            </button>

            {user && (
              <button
                className={`nav-link ${mode === "support" ? "active" : ""}`}
                onClick={() => setMode("support")}
              >
                <Headset size={18} /> Support Centre
              </button>
            )}

            {user && isAdminRole(user.role) && (
              <button
                className={`nav-link ${mode === "admin" ? "active" : ""}`}
                onClick={() => setMode("admin")}
              >
                <LayoutDashboard size={18} />{" "}
                {user.role === "staff" ? "Staff dashboard" : "Admin dashboard"}
              </button>
            )}

            {user?.role === "superadmin" && (
              <button
                className={`nav-link ${mode === "team" ? "active" : ""}`}
                onClick={() => setMode("team")}
              >
                <Users size={18} /> Team Management
              </button>
            )}

            {user?.role === "superadmin" && (
              <button
                className={`nav-link ${mode === "activity" ? "active" : ""}`}
                onClick={() => setMode("activity")}
              >
                <Activity size={18} /> Token Activity History
              </button>
            )}

            {user && ["admin", "superadmin"].includes(user.role) && (
              <button
                className={`nav-link ${mode === "services" ? "active" : ""}`}
                onClick={() => setMode("services")}
              >
                <ClipboardList size={18} /> Service Management
              </button>
            )}

            {user && ["admin", "superadmin"].includes(user.role) && (
              <button
                className={`nav-link ${mode === "analytics" ? "active" : ""}`}
                onClick={() => setMode("analytics")}
              >
                <BarChart3 size={18} /> Analytics
              </button>
            )}

            {user && ["admin", "superadmin"].includes(user.role) && (
              <button
                className={`nav-link ${
                  mode === "configuration" ? "active" : ""
                }`}
                onClick={() => setMode("configuration")}
              >
                <Settings2 size={18} /> Queue Configuration
              </button>
            )}

            <div className="sidebar-bottom">
              <div className="help-card">
                <div className="help-icon">
                  <Headset size={18} />
                </div>
                <strong>Need assistance?</strong>
                <p>QueueWise helps you spend less time waiting.</p>
              </div>

              <div className="profile">
                <div className="avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || "Q"}
                </div>
                <div>
                  <strong>{user?.name || "Guest visitor"}</strong>
                  <span>{user ? user.role : "Public user portal"}</span>
                </div>
                <ChevronDown size={16} />
              </div>
            </div>
          </aside>

          <main className="main-area">
            <header className="topbar">
              <div className="breadcrumb">
                Workspace <span>/</span>{" "}
                <strong>
                  {mode === "user"
                    ? "User portal"
                    : mode === "team"
                      ? "Team Management"
                      : mode === "services"
                        ? "Service Management"
                        : mode === "analytics"
                          ? "Analytics"
                          : mode === "configuration"
                            ? "Queue Configuration"
                            : mode === "support"
                              ? "Support Centre"
                              : user?.role === "staff"
                                ? "Staff dashboard"
                                : "Admin dashboard"}
                </strong>
              </div>

              <div className="top-actions">
                <span className="live-dot"></span>
                <span className="live-text">Live queue</span>

                <button
                  className="icon-button"
                  title="Refresh queue"
                  onClick={refresh}
                >
                  <RefreshCw size={17} />
                </button>

                {user ? (
                  <button
                    className="icon-button"
                    title="Sign out"
                    onClick={logout}
                  >
                    <LogOut size={17} />
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() => setMode("login")}
                  >
                    Sign in
                  </button>
                )}

                <div className="top-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || "Q"}
                </div>
              </div>
            </header>

            <div className="content">
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <Sparkles size={14} /> DIGITAL QUEUE MANAGEMENT
                  </div>
                  <h1>
                    {mode === "user"
                      ? "Skip the line. Keep your time."
                      : "Queue operations overview"}
                  </h1>
                  <p>
                    {mode === "user"
                      ? "Join a service queue digitally and follow your turn from wherever you are."
                      : "Manage service queues, call tokens and keep every queue moving."}
                  </p>
                </div>

                <div className="date-chip">
                  <Clock3 size={15} /> Live queue updates
                </div>
              </section>

              {error && (
                <div className="alert error">
                  <X size={17} />
                  {error}
                  <button onClick={() => setError("")}>
                    <X size={15} />
                  </button>
                </div>
              )}

              {notice && (
                <div className="alert success">
                  <CheckCircle2 size={17} />
                  {notice}
                  <button onClick={() => setNotice("")}>
                    <X size={15} />
                  </button>
                </div>
              )}

              {mode === "user" ? (
                <>
                  <div className="stats-grid user-stats">
                    <Stat
                      icon={<Users />}
                      label="People waiting"
                      value={stats.waiting}
                      tone="blue"
                    />
                    <Stat
                      icon={<Activity />}
                      label="Currently serving"
                      value={stats.serving}
                      tone="purple"
                    />
                    <Stat
                      icon={<CheckCircle2 />}
                      label="Completed"
                      value={stats.completed}
                      tone="green"
                    />
                  </div>

                  <div className="user-layout">
                    <section className="panel join-panel">
                      <div className="panel-heading">
                        <div>
                          <span className="section-kicker">GET STARTED</span>
                          <h2>Join a queue</h2>
                          <p>
                            Choose the service you need to receive a digital
                            token.
                          </p>
                        </div>
                        <div className="heading-icon">
                          <Plus size={20} />
                        </div>
                      </div>

                      <form onSubmit={generateToken}>
                        <label htmlFor="customer">
                          Your name <span className="optional">OPTIONAL</span>
                        </label>
                        <input
                          id="customer"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter your name"
                          maxLength={80}
                        />

                        <label>Select a service</label>
                        <div className="service-options">
                          {services.map((service) => (
                            <button
                              type="button"
                              key={service.id}
                              className={`service-option ${
                                selectedService === service.id ? "chosen" : ""
                              }`}
                              onClick={() => setSelectedService(service.id)}
                            >
                              <span className={`service-icon ${service.color}`}>
                                <ClipboardList size={19} />
                              </span>
                              <span className="service-copy">
                                <strong>{service.name}</strong>
                                <small>{service.description}</small>
                              </span>
                              <span className="service-wait">
                                {service.avgMinutes} min
                              </span>
                            </button>
                          ))}
                        </div>

                        <button
                          className="primary-button full"
                          disabled={busy || !services.length}
                        >
                          <Ticket size={17} />
                          {busy ? "Generating..." : "Generate my token"}
                          <ArrowRight size={17} />
                        </button>

                        <div className="privacy-note">
                          <ShieldCheck size={14} />
                          Your token is created instantly. No physical line
                          required.
                        </div>
                      </form>
                    </section>

                    <section className="right-column">
                      <div className="panel current-panel">
                        <div className="panel-heading compact">
                          <div>
                            <span className="section-kicker">YOUR TICKET</span>
                            <h2>Queue status</h2>
                          </div>
                          <span className="status-pill">
                            <span /> LIVE
                          </span>
                        </div>

                        {myToken ? (
                          <div className="ticket-content">
                            <div className="ticket-number">
                              <span>YOUR TOKEN</span>
                              <strong>{myToken.tokenNumber}</strong>
                              <small>{myToken.serviceName}</small>
                            </div>

                            <div className="ticket-metrics">
                              <div>
                                <strong>
                                  {myToken.status === "completed"
                                    ? "Done"
                                    : myToken.status === "serving"
                                      ? "Now"
                                      : [
                                            "skipped",
                                            "cancelled",
                                            "expired",
                                          ].includes(myToken.status)
                                        ? "—"
                                        : ahead}
                                </strong>
                                <span>
                                  {myToken.status === "completed"
                                    ? "Status"
                                    : myToken.status === "serving"
                                      ? "Your turn"
                                      : [
                                            "skipped",
                                            "cancelled",
                                            "expired",
                                          ].includes(myToken.status)
                                        ? "Status"
                                        : "People ahead"}
                                </span>
                              </div>
                              <div>
                                <strong>
                                  {myToken.status === "waiting"
                                    ? moneyTime(estimate)
                                    : "—"}
                                </strong>
                                <span>Estimated wait</span>
                              </div>
                            </div>

                            <div className="ticket-status">
                              <span
                                className={`status-dot ${myToken.status}`}
                              />
                              <span>
                                {myToken.status.charAt(0).toUpperCase() +
                                  myToken.status.slice(1)}
                              </span>
                              <small>Updates automatically</small>
                            </div>
                          </div>
                        ) : (
                          <div className="empty-ticket">
                            <div className="empty-icon">
                              <Ticket size={25} />
                            </div>
                            <strong>No active ticket yet</strong>
                            <p>
                              Generate a token to see your queue position and
                              estimated wait time here.
                            </p>
                          </div>
                        )}

                        {newRecoveryPin && myToken && (
                          <div
                            style={{
                              marginTop: 18,
                              padding: 16,
                              borderRadius: 12,
                              background: "#eef5ff",
                              border: "1px solid #cbdcff",
                            }}
                          >
                            <strong
                              style={{
                                display: "block",
                                color: "#244b91",
                                marginBottom: 6,
                              }}
                            >
                              Save your recovery PIN
                            </strong>
                            <div
                              style={{
                                fontSize: 28,
                                fontWeight: 800,
                                letterSpacing: 5,
                                color: "#17243b",
                              }}
                            >
                              {newRecoveryPin}
                            </div>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#526783",
                                margin: "8px 0",
                              }}
                            >
                              This PIN is shown only once. Keep it safe; you
                              need it to recover or cancel this ticket.
                            </p>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => setNewRecoveryPin("")}
                            >
                              I have saved my PIN
                            </button>
                          </div>
                        )}

                        {myToken?.status === "waiting" && (
                          <form
                            onSubmit={cancelMyTicket}
                            style={{
                              marginTop: 18,
                              paddingTop: 16,
                              borderTop: "1px solid #e8edf5",
                            }}
                          >
                            <label htmlFor="cancel-pin">
                              Cancel this ticket
                            </label>
                            <input
                              id="cancel-pin"
                              value={cancelPinInput}
                              onChange={(e) =>
                                setCancelPinInput(
                                  e.target.value
                                    .replace(/\\D/g, "")
                                    .slice(0, 6),
                                )
                              }
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="Enter 6-digit recovery PIN"
                              required
                            />
                            <button
                              className="secondary-button"
                              style={{ marginTop: 10 }}
                              disabled={busy || cancelPinInput.length !== 6}
                            >
                              Cancel waiting ticket
                            </button>
                          </form>
                        )}
                      </div>

                      <div className="panel" style={{ padding: 20 }}>
                        <div className="panel-heading compact">
                          <div>
                            <span className="section-kicker">
                              TICKET ACCESS
                            </span>
                            <h2>Recover a ticket</h2>
                          </div>
                          <Ticket size={19} />
                        </div>
                        <p
                          style={{
                            color: "#8290a5",
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          Lost your ticket or opened QueueWise on another
                          device? Enter your token number and recovery PIN.
                        </p>
                        {!showRecoveryForm ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setShowRecoveryForm(true)}
                          >
                            Recover existing ticket
                          </button>
                        ) : (
                          <form onSubmit={recoverTicket}>
                            <label htmlFor="recover-token">Token number</label>
                            <input
                              id="recover-token"
                              value={recoveryTokenNumber}
                              onChange={(e) =>
                                setRecoveryTokenNumber(
                                  e.target.value.toUpperCase(),
                                )
                              }
                              placeholder="Example: GE-004"
                              required
                            />
                            <label htmlFor="recover-pin">Recovery PIN</label>
                            <input
                              id="recover-pin"
                              value={recoveryPinInput}
                              onChange={(e) =>
                                setRecoveryPinInput(
                                  e.target.value
                                    .replace(/\\D/g, "")
                                    .slice(0, 6),
                                )
                              }
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="6-digit PIN"
                              required
                            />
                            <div
                              className="secondary-actions"
                              style={{ marginTop: 12 }}
                            >
                              <button
                                className="primary-button"
                                disabled={busy || recoveryPinInput.length !== 6}
                              >
                                {busy ? "Recovering..." : "Recover ticket"}
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setShowRecoveryForm(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      <div className="tip-card">
                        <div className="tip-icon">
                          <Bell size={18} />
                        </div>
                        <div>
                          <strong>Stay updated</strong>
                          <p>
                            Keep this page open. Your queue position refreshes
                            automatically every few seconds.
                          </p>
                        </div>
                      </div>

                      <div className="panel mini-queue">
                        <div className="panel-heading compact">
                          <div>
                            <span className="section-kicker">
                              SERVICE STATUS
                            </span>
                            <h2>Now serving</h2>
                          </div>
                          <Monitor size={19} className="muted-icon" />
                        </div>

                        {services.map((service) => (
                          <div className="serving-row" key={service.id}>
                            <span>{service.name}</span>
                            <strong>
                              {service.serving?.tokenNumber || "—"}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </>
              ) : mode === "team" && user?.role === "superadmin" ? (
                <StaffManagement />
              ) : mode === "services" &&
                ["admin", "superadmin"].includes(user?.role) ? (
                <ServiceManagement />
              ) : mode === "analytics" &&
                ["admin", "superadmin"].includes(user?.role) ? (
                <Analytics />
              ) : mode === "configuration" &&
                ["admin", "superadmin"].includes(user?.role) ? (
                <QueueConfiguration />
              ) : mode === "support" && user ? (
                <SupportCentre user={user} />
              ) : mode === "activity" && user?.role === "superadmin" ? (
                <TokenActivityHistory />
              ) : (
                <>
                  <div className="stats-grid">
                    <Stat
                      icon={<Ticket />}
                      label="Total tokens"
                      value={stats.total}
                      tone="blue"
                    />
                    <Stat
                      icon={<Clock3 />}
                      label="Waiting"
                      value={stats.waiting}
                      tone="amber"
                    />
                    <Stat
                      icon={<Activity />}
                      label="Being served"
                      value={stats.serving}
                      tone="purple"
                    />
                    <Stat
                      icon={<CheckCircle2 />}
                      label="Completed"
                      value={stats.completed}
                      tone="green"
                    />
                  </div>

                  <div className="admin-layout">
                    <section className="panel control-panel">
                      <div className="panel-heading">
                        <div>
                          <span className="section-kicker">
                            COUNTER CONTROL
                          </span>
                          <h2>Manage service queue</h2>
                          <p>Select a service queue to manage its tokens.</p>
                        </div>
                        <div className="heading-icon">
                          <ListChecks size={20} />
                        </div>
                      </div>

                      <label>Select service</label>
                      <div className="select-wrap">
                        <select
                          value={selectedService}
                          onChange={(e) => setSelectedService(e.target.value)}
                        >
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} />
                      </div>

                      <div className="counter-display">
                        <span>CURRENTLY SERVING</span>
                        <strong>{servingToken?.tokenNumber || "— — —"}</strong>
                        <small>
                          {servingToken
                            ? servingToken.customerName
                            : "No token is currently being served"}
                        </small>
                      </div>

                      <div className="next-up">
                        <div>
                          <span>NEXT IN LINE</span>
                          <strong>
                            {nextWaiting?.tokenNumber || "No waiting tokens"}
                          </strong>
                        </div>
                        <span className="queue-count">
                          {selectedQueue?.waitingCount || 0} waiting
                        </span>
                      </div>

                      <button
                        className="primary-button full"
                        disabled={busy || !nextWaiting || !!servingToken}
                        onClick={() => performAction(nextWaiting, "serve")}
                      >
                        <Activity size={17} />
                        Call next token
                        <ArrowRight size={17} />
                      </button>

                      <div className="secondary-actions">
                        <button
                          className="secondary-button"
                          disabled={busy || !servingToken}
                          onClick={() =>
                            performAction(servingToken, "complete")
                          }
                        >
                          <Check size={16} /> Complete
                        </button>
                        <button
                          className="secondary-button"
                          disabled={busy || !(servingToken || nextWaiting)}
                          onClick={() =>
                            performAction(servingToken || nextWaiting, "skip")
                          }
                        >
                          <SkipForward size={16} /> Skip token
                        </button>
                      </div>
                    </section>

                    <section className="panel queue-panel">
                      <div className="panel-heading table-heading">
                        <div>
                          <span className="section-kicker">QUEUE MONITOR</span>
                          <h2>Token management</h2>
                        </div>
                        <span className="count-badge">
                          {tokens.length} total
                        </span>
                      </div>

                      <div className="table-tools">
                        <div className="search-box">
                          <Search size={15} />
                          <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search token or service"
                          />
                        </div>
                        <select
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        >
                          <option value="all">All status</option>
                          <option value="waiting">Waiting</option>
                          <option value="serving">Serving</option>
                          <option value="completed">Completed</option>
                          <option value="skipped">Skipped</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>

                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>TOKEN</th>
                              <th>SERVICE</th>
                              <th>NAME</th>
                              <th>STATUS</th>
                              <th>ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleTokens.length ? (
                              displayedTokens.map((token) => {
                                const tokenService = services.find(
                                  (service) => service.id === token.serviceId,
                                );

                                const isFirstWaiting =
                                  tokenService?.waiting?.[0]?.id === token.id;

                                const canCall =
                                  token.status === "waiting" &&
                                  isFirstWaiting &&
                                  !tokenService?.serving;

                                return (
                                  <tr key={token.id}>
                                    <td className="token-cell">
                                      {token.tokenNumber}
                                    </td>
                                    <td>{token.serviceName}</td>
                                    <td>{token.customerName}</td>
                                    <td>
                                      <span
                                        className={`table-status ${token.status}`}
                                      >
                                        {token.status}
                                      </span>
                                    </td>

                                    <td>
                                      {token.status === "waiting" ? (
                                        <button
                                          className="text-action"
                                          disabled={busy || !canCall}
                                          onClick={() =>
                                            performAction(token, "serve")
                                          }
                                        >
                                          Call
                                        </button>
                                      ) : token.status === "serving" ? (
                                        <button
                                          className="text-action"
                                          disabled={busy}
                                          onClick={() =>
                                            performAction(token, "complete")
                                          }
                                        >
                                          Complete
                                        </button>
                                      ) : token.status === "skipped" ? (
                                        <button
                                          className="text-action"
                                          disabled={busy}
                                          onClick={() =>
                                            performAction(token, "unskip")
                                          }
                                        >
                                          Unskip
                                        </button>
                                      ) : (
                                        <span className="muted-dash">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="5" className="no-results">
                                  No tokens match your search.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="table-footer">
                        <span>
                          Showing{" "}
                          {Math.min(visibleTokenLimit, visibleTokens.length)} of{" "}
                          {visibleTokens.length} matching tickets
                        </span>

                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          {visibleTokenLimit < visibleTokens.length && (
                            <button
                              onClick={() =>
                                setVisibleTokenLimit(
                                  (previous) => previous + 10,
                                )
                              }
                            >
                              Load more older tickets
                            </button>
                          )}

                          <button onClick={refresh}>
                            <RefreshCw size={13} /> Refresh
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              )}

              <footer className="footer">
                <span>© 2026 QueueWise</span>
                <span>
                  Digital queue management · Built for better service
                  experiences
                </span>
              </footer>
            </div>
          </main>
        </div>
      )}
    </>
  );
}

export default App;
