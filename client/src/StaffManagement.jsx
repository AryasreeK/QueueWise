import { useState } from "react";
import {
  UserPlus,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API = "http://localhost:5000/api";

export default function StaffManagement() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createdUser, setCreatedUser] = useState(null);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function createAccount(event) {
    event.preventDefault();

    setBusy(true);
    setMessage("");
    setError("");
    setCreatedUser(null);

    try {
      const token = localStorage.getItem("queuewise_auth_token");

      if (!token) {
        throw new Error("Please sign in as Super Admin first.");
      }

      const response = await fetch(`${API}/auth/create-staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to create account.");
      }

      setMessage(data.message || "Account created successfully.");
      setCreatedUser(data.user);

      setForm({
        name: "",
        email: "",
        password: "",
        role: "staff",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.8fr)",
        gap: 22,
      }}
    >
      <section className="panel" style={{ padding: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="section-kicker">USER ACCESS</span>
            <h2>Create team account</h2>
            <p>Create an Admin or Staff login for your organisation.</p>
          </div>
          <div className="heading-icon">
            <UserPlus size={20} />
          </div>
        </div>

        {message && (
          <div className="alert success">
            <CheckCircle2 size={17} />
            {message}
          </div>
        )}

        {error && (
          <div className="alert error">
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        <form onSubmit={createAccount}>
          <label htmlFor="staff-name">Full name</label>
          <input
            id="staff-name"
            name="name"
            value={form.name}
            onChange={updateField}
            placeholder="Enter full name"
            maxLength={80}
            required
          />

          <label htmlFor="staff-email">Email address</label>
          <input
            id="staff-email"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            placeholder="Enter email address"
            required
          />

          <label htmlFor="staff-password">Temporary password</label>
          <input
            id="staff-password"
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            placeholder="Minimum 8 characters"
            minLength={8}
            maxLength={72}
            required
          />

          <label htmlFor="staff-role">Account role</label>
          <select
            id="staff-role"
            name="role"
            value={form.role}
            onChange={updateField}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            className="primary-button full"
            disabled={busy}
            style={{ marginTop: 22 }}
          >
            <UserPlus size={17} />
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>
      </section>

      <section className="panel" style={{ padding: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="section-kicker">ROLE PERMISSIONS</span>
            <h2>Access levels</h2>
            <p>Understand what each account can access.</p>
          </div>
          <ShieldCheck size={21} />
        </div>

        <div
          style={{
            padding: 15,
            border: "1px solid #e5eaf3",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <strong>Super Admin</strong>
          <p style={{ fontSize: 12, color: "#8290a5" }}>
            Full administrative access, including team account creation.
          </p>
        </div>

        <div
          style={{
            padding: 15,
            border: "1px solid #e5eaf3",
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <strong>Admin</strong>
          <p style={{ fontSize: 12, color: "#8290a5" }}>
            Access to the queue dashboard and queue operations.
          </p>
        </div>

        <div
          style={{ padding: 15, border: "1px solid #e5eaf3", borderRadius: 10 }}
        >
          <strong>Staff</strong>
          <p style={{ fontSize: 12, color: "#8290a5" }}>
            Access to authorised queue operations.
          </p>
        </div>

        {createdUser && (
          <div
            style={{
              marginTop: 20,
              padding: 15,
              background: "#effaf4",
              borderRadius: 10,
            }}
          >
            <strong>New account created</strong>
            <p style={{ fontSize: 13, marginBottom: 5 }}>
              Name: {createdUser.name}
            </p>
            <p style={{ fontSize: 13, marginBottom: 5 }}>
              Email: {createdUser.email}
            </p>
            <p style={{ fontSize: 13 }}>Role: {createdUser.role}</p>
          </div>
        )}
      </section>
    </div>
  );
}
