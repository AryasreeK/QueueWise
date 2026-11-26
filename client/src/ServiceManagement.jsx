import { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Pencil,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Save,
  X,
} from "lucide-react";

const API = "http://localhost:5000/api";
const TOKEN_KEY = "queuewise_auth_token";

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

const emptyForm = {
  name: "",
  description: "",
  prefix: "",
  avgMinutes: 5,
  color: "blue",
};

const colors = ["blue", "violet", "amber", "green", "red"];

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadServices() {
    setLoading(true);
    setError("");

    try {
      const data = await request("/services/manage");
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(service) {
    setEditingId(service.id);

    setForm({
      name: service.name || "",
      description: service.description || "",
      prefix: service.prefix || "",
      avgMinutes: service.avgMinutes || 5,
      color: service.color || "blue",
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        avgMinutes: Number(form.avgMinutes),
        color: form.color,
      };

      let data;

      if (editingId) {
        data = await request(`/services/manage/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        data = await request("/services/manage", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            prefix: form.prefix.trim().toUpperCase(),
          }),
        });
      }

      setMessage(data.message || "Service saved successfully.");
      resetForm();
      await loadServices();
    } catch (err) {
      setError(err.message || "Could not save service.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(service) {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const data = await request(`/services/manage/${service.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          active: !service.active,
        }),
      });

      setMessage(data.message || "Service status updated.");
      await loadServices();
    } catch (err) {
      setError(err.message || "Could not update service status.");
    } finally {
      setBusy(false);
    }
  }

  const activeCount = services.filter((service) => service.active).length;

  const inactiveCount = services.length - activeCount;

  return (
    <div className="sm-container">
      <style>{`
        .sm-container {
          display: grid;
          gap: 22px;
        }

        .sm-panel {
          background: #fff;
          border: 1px solid #e5eaf2;
          border-radius: 14px;
          padding: 24px;
        }

        .sm-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .sm-heading h2 {
          margin: 5px 0;
          color: #17243b;
          font-size: 20px;
        }

        .sm-heading p {
          margin: 0;
          color: #8290a5;
          font-size: 12px;
        }

        .sm-kicker {
          color: #6485ca;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .sm-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .sm-stat {
          padding: 18px;
          border: 1px solid #e8edf5;
          border-radius: 11px;
          background: #fafcff;
        }

        .sm-stat span {
          display: block;
          color: #8290a5;
          font-size: 11px;
          margin-bottom: 8px;
        }

        .sm-stat strong {
          color: #17243b;
          font-size: 24px;
        }

        .sm-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .sm-field {
          display: grid;
          gap: 7px;
        }

        .sm-field.full {
          grid-column: 1 / -1;
        }

        .sm-field label {
          color: #48566e;
          font-size: 12px;
          font-weight: 700;
        }

        .sm-field input,
        .sm-field textarea,
        .sm-field select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 11px;
          color: #34435b;
          font-size: 12px;
          background: white;
          outline: none;
        }

        .sm-field textarea {
          resize: vertical;
          min-height: 75px;
        }

        .sm-field input:focus,
        .sm-field textarea:focus,
        .sm-field select:focus {
          border-color: #86a8f5;
          box-shadow: 0 0 0 3px #edf3ff;
        }

        .sm-field input:disabled {
          background: #f3f5f8;
          color: #8290a5;
        }

        .sm-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 5px;
        }

        .sm-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .sm-btn:disabled {
          opacity: .55;
          cursor: wait;
        }

        .sm-primary {
          color: white;
          background: #477ee8;
        }

        .sm-secondary {
          color: #48566e;
          background: #f0f3f8;
          border: 1px solid #e2e8f0;
        }

        .sm-success {
          color: #16834a;
          background: #eaf8f0;
        }

        .sm-warning {
          color: #bd514b;
          background: #fff0ef;
        }

        .sm-alert {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 15px;
        }

        .sm-alert.success {
          color: #16834a;
          background: #eaf8f0;
        }

        .sm-alert.error {
          color: #bd514b;
          background: #fff0ef;
        }

        .sm-service-list {
          display: grid;
          gap: 12px;
        }

        .sm-service {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          border: 1px solid #e7ecf3;
          border-radius: 11px;
          padding: 17px;
          background: white;
        }

        .sm-service-info {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 200px;
        }

        .sm-service-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: #477ee8;
          background: #edf3ff;
        }

        .sm-service-info strong {
          display: block;
          color: #17243b;
          font-size: 13px;
        }

        .sm-service-info p {
          margin: 5px 0;
          color: #8290a5;
          font-size: 11px;
        }

        .sm-meta {
          color: #64748b;
          font-size: 11px;
        }

        .sm-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 800;
          margin-top: 5px;
        }

        .sm-status.active {
          color: #16834a;
        }

        .sm-status.inactive {
          color: #bd514b;
        }

        .sm-service-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sm-empty {
          padding: 28px;
          text-align: center;
          color: #8290a5;
          font-size: 12px;
        }

        @media (max-width: 650px) {
          .sm-stats {
            grid-template-columns: 1fr;
          }

          .sm-form {
            grid-template-columns: 1fr;
          }

          .sm-field.full {
            grid-column: auto;
          }

          .sm-panel {
            padding: 17px;
          }
        }
      `}</style>

      <section className="sm-panel">
        <div className="sm-heading">
          <div>
            <span className="sm-kicker">SERVICE OVERVIEW</span>
            <h2>Service Management</h2>
            <p>
              Create, update and control the services available in QueueWise.
            </p>
          </div>

          <button
            className="sm-btn sm-secondary"
            onClick={loadServices}
            disabled={loading || busy}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="sm-stats">
          <div className="sm-stat">
            <span>Total services</span>
            <strong>{services.length}</strong>
          </div>

          <div className="sm-stat">
            <span>Active services</span>
            <strong>{activeCount}</strong>
          </div>

          <div className="sm-stat">
            <span>Inactive services</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>

        {message && (
          <div className="sm-alert success">
            <CheckCircle2 size={17} />
            {message}
          </div>
        )}

        {error && (
          <div className="sm-alert error">
            <XCircle size={17} />
            {error}
          </div>
        )}

        <div className="sm-heading">
          <div>
            <span className="sm-kicker">SERVICE CONFIGURATION</span>
            <h2>{editingId ? "Edit service" : "Add new service"}</h2>
            <p>
              {editingId
                ? "Update the selected service details."
                : "Add a new service to your queue system."}
            </p>
          </div>
        </div>

        <form className="sm-form" onSubmit={handleSubmit}>
          <div className="sm-field">
            <label htmlFor="sm-name">Service name</label>
            <input
              id="sm-name"
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Example: Admission Enquiry"
              maxLength={80}
              required
            />
          </div>

          <div className="sm-field">
            <label htmlFor="sm-prefix">Token prefix</label>
            <input
              id="sm-prefix"
              name="prefix"
              value={form.prefix}
              onChange={updateField}
              placeholder="Example: AD"
              maxLength={4}
              disabled={!!editingId}
              required={!editingId}
            />
          </div>

          <div className="sm-field full">
            <label htmlFor="sm-description">Description</label>
            <textarea
              id="sm-description"
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="Describe the service..."
              maxLength={250}
            />
          </div>

          <div className="sm-field">
            <label htmlFor="sm-minutes">Average service time (minutes)</label>
            <input
              id="sm-minutes"
              name="avgMinutes"
              type="number"
              min="1"
              max="1440"
              value={form.avgMinutes}
              onChange={updateField}
              required
            />
          </div>

          <div className="sm-field">
            <label htmlFor="sm-color">Service colour</label>
            <select
              id="sm-color"
              name="color"
              value={form.color}
              onChange={updateField}
            >
              {colors.map((color) => (
                <option key={color} value={color}>
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm-field full">
            <div className="sm-actions">
              <button
                type="submit"
                className="sm-btn sm-primary"
                disabled={busy}
              >
                {editingId ? <Save size={15} /> : <Plus size={15} />}
                {busy
                  ? "Please wait..."
                  : editingId
                    ? "Save changes"
                    : "Create service"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="sm-btn sm-secondary"
                  onClick={resetForm}
                  disabled={busy}
                >
                  <X size={15} />
                  Cancel editing
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      <section className="sm-panel">
        <div className="sm-heading">
          <div>
            <span className="sm-kicker">SERVICE DIRECTORY</span>
            <h2>Available services</h2>
            <p>Manage service details and availability.</p>
          </div>
        </div>

        {loading ? (
          <div className="sm-empty">Loading services...</div>
        ) : services.length === 0 ? (
          <div className="sm-empty">No services found.</div>
        ) : (
          <div className="sm-service-list">
            {services.map((service) => (
              <div className="sm-service" key={service.id}>
                <div className="sm-service-info">
                  <div className="sm-service-icon">
                    <ClipboardList size={20} />
                  </div>

                  <div>
                    <strong>{service.name}</strong>

                    <p>{service.description || "No description provided"}</p>

                    <div className="sm-meta">
                      ID: {service.id} · Prefix: {service.prefix} · Average:{" "}
                      {service.avgMinutes} min
                    </div>

                    <span
                      className={`sm-status ${
                        service.active ? "active" : "inactive"
                      }`}
                    >
                      {service.active ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                      {service.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>

                <div className="sm-service-actions">
                  <button
                    className="sm-btn sm-secondary"
                    onClick={() => startEditing(service)}
                    disabled={busy}
                  >
                    <Pencil size={14} />
                    Edit
                  </button>

                  <button
                    className={`sm-btn ${
                      service.active ? "sm-warning" : "sm-success"
                    }`}
                    onClick={() => toggleStatus(service)}
                    disabled={busy}
                  >
                    {service.active ? (
                      <XCircle size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {service.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
