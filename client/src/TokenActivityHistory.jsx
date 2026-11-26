import { useEffect, useState } from "react";
import { RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";

const API = "http://localhost:5000/api";
const TOKEN_KEY = "queuewise_auth_token";

const actions = [
  "generated",
  "called",
  "completed",
  "skipped",
  "unskipped",
  "cancelled",
  "expired",
];

export default function TokenActivityHistory() {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadActivities() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        action,
      });

      const token = localStorage.getItem(TOKEN_KEY);
      const response = await fetch(
        `${API}/token-activity?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load activity history.");
      }

      setActivities(data.activities || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
  }, [page, action]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    loadActivities();
  }

  function formatDate(date) {
    return new Date(date).toLocaleString();
  }

  function formatAction(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Token Activity History</h2>
          <p>Complete audit trail of QueueWise token operations.</p>
        </div>

        <button className="secondary-button" onClick={loadActivities}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: 12,
            }}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search token, customer or service..."
            style={{ paddingLeft: 36, width: "100%" }}
          />
        </div>

        <select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All activities</option>
          {actions.map((item) => (
            <option key={item} value={item}>
              {formatAction(item)}
            </option>
          ))}
        </select>

        <button className="primary-button" type="submit">
          Search
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Token</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Activity</th>
              <th>Performed By</th>
              <th>Role</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Loading activity history...</td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan="8">No activity records found.</td>
              </tr>
            ) : (
              activities.map((item) => (
                <tr key={item._id}>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>
                    <strong>{item.tokenNumber}</strong>
                  </td>
                  <td>{item.customerName || "Guest"}</td>
                  <td>{item.serviceName}</td>
                  <td>{formatAction(item.action)}</td>
                  <td>{item.performedByName || "System"}</td>
                  <td>{item.performedByRole || "system"}</td>
                  <td>{item.details || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 18,
          gap: 12,
        }}
      >
        <span>Total records: {pagination.totalRecords || 0}</span>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="secondary-button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((previous) => previous - 1)}
          >
            <ChevronLeft size={15} /> Previous
          </button>

          <span>
            Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
          </span>

          <button
            className="secondary-button"
            disabled={page >= (pagination.totalPages || 1) || loading}
            onClick={() => setPage((previous) => previous + 1)}
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
