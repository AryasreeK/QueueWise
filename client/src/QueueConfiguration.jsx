import { useEffect, useState } from "react";
import {
  Settings2,
  Clock3,
  Users,
  Ticket,
  Bell,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API = "http://localhost:5000/api";
const TOKEN_KEY = "queuewise_auth_token";

const DEFAULT_CONFIG = {
  maxWaitingPerService: 50,
  ticketExpiryHours: 2,
  allowCancellation: true,
  operatingHours: {
    enabled: false,
    openingTime: "09:00",
    closingTime: "17:00",
    timeZone: "Asia/Kolkata",
  },
  notificationsEnabled: false,
};

async function configRequest(path, options = {}) {
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

function SettingCard({ icon, title, description, children }) {
  return (
    <section className="panel" style={{ padding: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div className="heading-icon">{icon}</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
          <p style={{ margin: "5px 0 0", color: "#8290a5", fontSize: 12 }}>
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        cursor: "pointer",
      }}
    >
      <span>
        <strong style={{ display: "block", fontSize: 13 }}>{label}</strong>
        <small style={{ color: "#8290a5", fontSize: 11 }}>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ width: 18, height: 18, accentColor: "#477ee8" }}
      />
    </label>
  );
}

export default function QueueConfiguration() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadConfiguration() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await configRequest("/queue-config");

      setConfig({
        ...DEFAULT_CONFIG,
        ...data,
        operatingHours: {
          ...DEFAULT_CONFIG.operatingHours,
          ...(data.operatingHours || {}),
        },
      });
    } catch (err) {
      setError(err.message || "Could not load queue configuration.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfiguration();
  }, []);

  function updateConfig(field, value) {
    setConfig((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateOperatingHours(field, value) {
    setConfig((previous) => ({
      ...previous,
      operatingHours: {
        ...previous.operatingHours,
        [field]: value,
      },
    }));
  }

  async function saveConfiguration(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const data = await configRequest("/queue-config", {
        method: "PUT",
        body: JSON.stringify({
          maxWaitingPerService: Number(config.maxWaitingPerService),
          ticketExpiryHours: Number(config.ticketExpiryHours),
          allowCancellation: config.allowCancellation,
          operatingHours: config.operatingHours,
          notificationsEnabled: config.notificationsEnabled,
        }),
      });

      if (data.config) {
        setConfig((previous) => ({
          ...previous,
          ...data.config,
          operatingHours: {
            ...previous.operatingHours,
            ...(data.config.operatingHours || {}),
          },
        }));
      }

      setMessage(data.message || "Queue configuration saved successfully.");
    } catch (err) {
      setError(err.message || "Could not save queue configuration.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="panel" style={{ padding: 28 }}>
        Loading queue configuration...
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section className="panel" style={{ padding: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="section-kicker">SYSTEM SETTINGS</span>
            <h2>Queue Configuration</h2>
            <p>
              Configure queue capacity, ticket expiry, cancellation and
              operating hours.
            </p>
          </div>
          <div className="heading-icon">
            <Settings2 size={20} />
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

        <form onSubmit={saveConfiguration}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
              marginTop: 22,
            }}
          >
            <SettingCard
              icon={<Users size={19} />}
              title="Queue Capacity"
              description="Set the maximum number of waiting tokens per service."
            >
              <label htmlFor="max-waiting">Maximum waiting tokens</label>
              <input
                id="max-waiting"
                type="number"
                min="1"
                max="500"
                value={config.maxWaitingPerService}
                onChange={(e) =>
                  updateConfig("maxWaitingPerService", e.target.value)
                }
                required
              />
              <small style={{ color: "#8290a5" }}>
                Allowed range: 1–500 tokens per service.
              </small>
            </SettingCard>

            <SettingCard
              icon={<Ticket size={19} />}
              title="Ticket Expiry"
              description="Set how long a waiting ticket remains valid."
            >
              <label htmlFor="ticket-expiry">Expiry duration</label>
              <select
                id="ticket-expiry"
                value={config.ticketExpiryHours}
                onChange={(e) =>
                  updateConfig("ticketExpiryHours", e.target.value)
                }
              >
                {[1, 2, 3, 4, 5, 6, 8, 12, 24].map((hours) => (
                  <option key={hours} value={hours}>
                    {hours} {hours === 1 ? "hour" : "hours"}
                  </option>
                ))}
              </select>
              <small style={{ color: "#8290a5" }}>
                Allowed range: 1–24 hours.
              </small>
            </SettingCard>

            <SettingCard
              icon={<Clock3 size={19} />}
              title="Operating Hours"
              description="Define the service centre's operating schedule."
            >
              <Toggle
                checked={config.operatingHours.enabled}
                onChange={(value) => updateOperatingHours("enabled", value)}
                label="Enable operating hours"
                description="Restrict queue operation to the configured hours."
              />

              {config.operatingHours.enabled && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  <div>
                    <label htmlFor="opening-time">Opening time</label>
                    <input
                      id="opening-time"
                      type="time"
                      value={config.operatingHours.openingTime}
                      onChange={(e) =>
                        updateOperatingHours("openingTime", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="closing-time">Closing time</label>
                    <input
                      id="closing-time"
                      type="time"
                      value={config.operatingHours.closingTime}
                      onChange={(e) =>
                        updateOperatingHours("closingTime", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              )}

              <small style={{ color: "#8290a5" }}>
                Time zone: Asia/Kolkata (IST)
              </small>
            </SettingCard>

            <SettingCard
              icon={<Settings2 size={19} />}
              title="Cancellation"
              description="Control whether users can cancel waiting tickets."
            >
              <Toggle
                checked={config.allowCancellation}
                onChange={(value) => updateConfig("allowCancellation", value)}
                label="Allow ticket cancellation"
                description="Users can cancel their own waiting tickets."
              />
            </SettingCard>

            <SettingCard
              icon={<Bell size={19} />}
              title="Notifications"
              description="Configure the notification preference."
            >
              <Toggle
                checked={config.notificationsEnabled}
                onChange={(value) =>
                  updateConfig("notificationsEnabled", value)
                }
                label="Enable notifications"
                description="Turn the notification setting on or off."
              />
              <small
                style={{
                  display: "block",
                  color: "#a06b22",
                  marginTop: 14,
                  fontSize: 11,
                }}
              >
                Notification delivery requires a separate notification
                integration.
              </small>
            </SettingCard>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 22,
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={loadConfiguration}
              disabled={saving}
            >
              <RefreshCw size={15} /> Reload settings
            </button>

            <button type="submit" className="primary-button" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : "Save configuration"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
