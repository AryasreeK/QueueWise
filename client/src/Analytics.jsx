import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";

const API = "http://localhost:5000/api";
const TOKEN_KEY = "queuewise_auth_token";

function getDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMinutes(value) {
  if (!value) return "—";
  return `${value} min`;
}

function MetricCard({ icon, label, value, description }) {
  return (
    <div className="analytics-metric">
      <div className="analytics-metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function Analytics() {
  const today = new Date();
  const previousWeek = new Date();
  previousWeek.setDate(today.getDate() - 6);

  const [from, setFrom] = useState(getDateString(previousWeek));
  const [to, setTo] = useState(getDateString(today));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem(TOKEN_KEY);

      const start = new Date(`${from}T00:00:00+05:30`).toISOString();
      const end = new Date(`${to}T23:59:59.999+05:30`).toISOString();

      const params = new URLSearchParams({
        from: start,
        to: end,
        timeZone: "Asia/Kolkata",
      });

      const response = await fetch(`${API}/analytics?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Unable to load analytics.");
      }

      setData(result);
    } catch (err) {
      setError(err.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const summary = data?.summary || {};
  const averages = data?.averages || {};
  const dailyTrend = data?.dailyTrend || [];
  const serviceBreakdown = data?.serviceBreakdown || [];
  const peakHours = data?.peakHours || [];

  const maxDaily = Math.max(1, ...dailyTrend.map((item) => item.total));

  const maxService = Math.max(1, ...serviceBreakdown.map((item) => item.total));

  const busiestHour = peakHours[0];

  return (
    <div className="analytics-page">
      <style>{`
        .analytics-page {
          display: grid;
          gap: 20px;
          color: #26364d;
        }

        .analytics-page * {
          box-sizing: border-box;
        }

        .analytics-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
        }

        .analytics-heading h2 {
          margin: 5px 0;
          font-size: 22px;
          color: #17243b;
        }

        .analytics-heading p {
          margin: 0;
          color: #8290a5;
          font-size: 12px;
        }

        .analytics-filter {
          display: flex;
          gap: 10px;
          align-items: end;
          flex-wrap: wrap;
          padding: 16px;
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 12px;
        }

        .analytics-filter label {
          display: grid;
          gap: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .analytics-filter input {
          padding: 10px;
          border: 1px solid #dce3ed;
          border-radius: 7px;
          color: #34435b;
          font: inherit;
          font-size: 12px;
        }

        .analytics-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 7px;
          padding: 11px 15px;
          background: #477ee8;
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .analytics-button:disabled {
          opacity: .6;
          cursor: wait;
        }

        .analytics-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .analytics-metric {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          padding: 18px;
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 12px;
        }

        .analytics-metric-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #edf3ff;
          color: #477ee8;
        }

        .analytics-metric span,
        .analytics-metric small {
          display: block;
          color: #8290a5;
          font-size: 11px;
        }

        .analytics-metric strong {
          display: block;
          margin: 5px 0;
          color: #17243b;
          font-size: 23px;
        }

        .analytics-panel {
          min-width: 0;
          padding: 20px;
          background: white;
          border: 1px solid #e5eaf2;
          border-radius: 12px;
        }

        .analytics-panel h3 {
          margin: 0 0 5px;
          color: #17243b;
          font-size: 15px;
        }

        .analytics-subtitle {
          margin: 0 0 18px;
          color: #8290a5;
          font-size: 11px;
        }

        .analytics-two-column {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 16px;
        }

        .analytics-bars {
          display: flex;
          align-items: end;
          gap: 10px;
          min-height: 190px;
          padding-top: 10px;
          overflow-x: auto;
        }

        .analytics-bar-column {
          display: flex;
          flex: 1;
          min-width: 35px;
          flex-direction: column;
          align-items: center;
          justify-content: end;
          gap: 7px;
          height: 180px;
        }

        .analytics-bar-value {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .analytics-bar {
          width: min(100%, 34px);
          min-height: 3px;
          border-radius: 6px 6px 2px 2px;
          background: linear-gradient(180deg,#6495f3,#477ee8);
        }

        .analytics-bar-label {
          color: #8290a5;
          font-size: 9px;
          white-space: nowrap;
        }

        .analytics-service-list {
          display: grid;
          gap: 17px;
        }

        .analytics-service-row {
          display: grid;
          gap: 7px;
        }

        .analytics-service-info {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
        }

        .analytics-service-info strong {
          color: #34435b;
        }

        .analytics-service-info span {
          color: #8290a5;
        }

        .analytics-progress {
          height: 8px;
          overflow: hidden;
          border-radius: 10px;
          background: #edf1f7;
        }

        .analytics-progress > div {
          height: 100%;
          border-radius: inherit;
          background: #648cf0;
        }

        .analytics-status-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .analytics-status-item {
          padding: 13px;
          border-radius: 9px;
          background: #f7f9fc;
        }

        .analytics-status-item span {
          display: block;
          color: #8290a5;
          font-size: 10px;
          text-transform: capitalize;
        }

        .analytics-status-item strong {
          display: block;
          margin-top: 5px;
          font-size: 20px;
          color: #26364d;
        }

        .analytics-hours {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 7px;
          align-items: end;
          min-height: 125px;
        }

        .analytics-hour {
          display: grid;
          justify-items: center;
          gap: 6px;
        }

        .analytics-hour-bar {
          width: 100%;
          min-height: 3px;
          border-radius: 4px 4px 0 0;
          background: #7c94e9;
        }

        .analytics-hour span {
          color: #8290a5;
          font-size: 9px;
        }

        .analytics-empty {
          padding: 25px 10px;
          color: #8290a5;
          text-align: center;
          font-size: 12px;
        }

        .analytics-error {
          padding: 13px;
          border: 1px solid #ffd9d6;
          border-radius: 9px;
          background: #fff0ef;
          color: #bd514b;
          font-size: 12px;
        }

        @media (max-width: 1000px) {
          .analytics-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .analytics-two-column {
            grid-template-columns: 1fr;
          }

          .analytics-status-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 450px) {
          .analytics-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="analytics-heading">
        <div>
          <span className="section-kicker">PERFORMANCE INSIGHTS</span>
          <h2>Queue Analytics</h2>
          <p>Monitor queue activity and service performance.</p>
        </div>
        <BarChart3 size={28} color="#477ee8" />
      </div>

      <form
        className="analytics-filter"
        onSubmit={(event) => {
          event.preventDefault();
          loadAnalytics();
        }}
      >
        <label>
          From date
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            required
          />
        </label>

        <label>
          To date
          <input
            type="date"
            value={to}
            min={from}
            max={getDateString(new Date())}
            onChange={(event) => setTo(event.target.value)}
            required
          />
        </label>

        <button className="analytics-button" disabled={loading}>
          <RefreshCw size={14} />
          {loading ? "Loading..." : "Apply filter"}
        </button>
      </form>

      {error && <div className="analytics-error">{error}</div>}

      {loading && !data ? (
        <div className="analytics-panel analytics-empty">
          Loading analytics...
        </div>
      ) : data ? (
        <>
          <div className="analytics-metrics">
            <MetricCard
              icon={<Ticket size={20} />}
              label="Total tokens"
              value={summary.total || 0}
              description="Tokens generated"
            />
            <MetricCard
              icon={<CheckCircle2 size={20} />}
              label="Completed"
              value={summary.completed || 0}
              description="Successfully served"
            />
            <MetricCard
              icon={<Clock3 size={20} />}
              label="Average waiting"
              value={formatMinutes(averages.waitingMinutes)}
              description={`${averages.waitingSamples || 0} measured tickets`}
            />
            <MetricCard
              icon={<Activity size={20} />}
              label="Average service"
              value={formatMinutes(averages.serviceMinutes)}
              description={`${averages.serviceSamples || 0} completed tickets`}
            />
          </div>

          <div className="analytics-panel">
            <h3>Token status overview</h3>
            <p className="analytics-subtitle">
              Distribution of tokens created during the selected period.
            </p>

            <div className="analytics-status-grid">
              {[
                ["waiting", summary.waiting],
                ["serving", summary.serving],
                ["completed", summary.completed],
                ["skipped", summary.skipped],
                ["cancelled", summary.cancelled],
                ["expired", summary.expired],
              ].map(([label, value]) => (
                <div className="analytics-status-item" key={label}>
                  <span>{label}</span>
                  <strong>{value || 0}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-two-column">
            <section className="analytics-panel">
              <h3>Daily token trend</h3>
              <p className="analytics-subtitle">Tokens generated each day.</p>

              {dailyTrend.length ? (
                <div className="analytics-bars">
                  {dailyTrend.map((item) => (
                    <div className="analytics-bar-column" key={item.date}>
                      <span className="analytics-bar-value">{item.total}</span>
                      <div
                        className="analytics-bar"
                        style={{
                          height: `${Math.max(
                            3,
                            (item.total / maxDaily) * 125,
                          )}px`,
                        }}
                        title={`${item.total} tokens`}
                      />
                      <span className="analytics-bar-label">
                        {item.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="analytics-empty">
                  No tokens in this date range.
                </div>
              )}
            </section>

            <section className="analytics-panel">
              <h3>Service-wise performance</h3>
              <p className="analytics-subtitle">Token volume by service.</p>

              {serviceBreakdown.length ? (
                <div className="analytics-service-list">
                  {serviceBreakdown.map((service) => (
                    <div
                      className="analytics-service-row"
                      key={service.serviceId}
                    >
                      <div className="analytics-service-info">
                        <strong>{service.serviceName}</strong>
                        <span>
                          {service.total} tokens · {service.completed} completed
                        </span>
                      </div>
                      <div className="analytics-progress">
                        <div
                          style={{
                            width: `${(service.total / maxService) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="analytics-empty">
                  No service activity found.
                </div>
              )}
            </section>
          </div>

          <section className="analytics-panel">
            <h3>Hourly activity</h3>
            <p className="analytics-subtitle">
              Token generation by hour of day (Indian Standard Time).
            </p>

            <div className="analytics-hours">
              {peakHours
                .slice()
                .sort((a, b) => a.hour - b.hour)
                .map((item) => {
                  const maxHour = Math.max(
                    1,
                    ...peakHours.map((hour) => hour.count),
                  );

                  return (
                    <div className="analytics-hour" key={item.hour}>
                      <div
                        className="analytics-hour-bar"
                        style={{
                          height: `${Math.max(
                            3,
                            (item.count / maxHour) * 85,
                          )}px`,
                        }}
                        title={`${item.label}: ${item.count} tokens`}
                      />
                      <span>{item.hour}</span>
                    </div>
                  );
                })}
            </div>

            <p className="analytics-subtitle" style={{ marginTop: 14 }}>
              Busiest hour:{" "}
              <strong>
                {busiestHour?.count > 0
                  ? `${busiestHour.label} (${busiestHour.count} tokens)`
                  : "No activity"}
              </strong>
            </p>
          </section>
        </>
      ) : (
        <div className="analytics-panel analytics-empty">
          Select a date range and apply the filter to view analytics.
        </div>
      )}
    </div>
  );
}

export default Analytics;
