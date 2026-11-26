import { useCallback, useEffect, useState } from "react";
import {
  Headset,
  Plus,
  RefreshCw,
  Send,
  CheckCircle2,
  UserCheck,
  ArrowRightLeft,
  MessageSquare,
  Clock3,
  AlertCircle,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "queuewise_auth_token";

async function supportRequest(path, options = {}) {
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

const categories = [
  { value: "technical", label: "Technical issue" },
  { value: "token", label: "Token or queue issue" },
  { value: "account", label: "Account issue" },
  { value: "service", label: "Service issue" },
  { value: "other", label: "Other" },
];

const statusColors = {
  open: "#d97706",
  claimed: "#2563eb",
  in_progress: "#7c3aed",
  resolved: "#059669",
  closed: "#64748b",
};

const styles = {
  page: { display: "grid", gap: 20 },
  panel: {
    background: "#fff",
    border: "1px solid #e8edf5",
    borderRadius: 14,
    padding: 22,
    minWidth: 0,
  },
  heading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  title: { margin: 0, fontSize: 21, color: "#182338" },
  muted: { color: "#8290a5", fontSize: 13, lineHeight: 1.6 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #dce3ed",
    borderRadius: 8,
    marginTop: 7,
    marginBottom: 14,
    font: "inherit",
    color: "#182338",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#43516a",
  },
  primary: {
    border: 0,
    borderRadius: 8,
    padding: "11px 15px",
    background: "#315ee7",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  secondary: {
    border: "1px solid #dce3ed",
    borderRadius: 8,
    padding: "10px 13px",
    background: "#fff",
    color: "#34445e",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  smallButton: {
    border: "1px solid #dce3ed",
    borderRadius: 7,
    padding: "7px 10px",
    background: "#fff",
    color: "#34445e",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.8fr)",
    gap: 18,
    alignItems: "start",
  },
};

function Status({ value }) {
  const color = statusColors[value] || "#64748b";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: 20,
        background: `${color}15`,
        color,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {(value || "open").replace("_", " ")}
    </span>
  );
}

function RequestDetails({
  request,
  user,
  onRefresh,
  setNotice,
  setError,
  admins,
}) {
  const [reply, setReply] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [reassignmentNote, setReassignmentNote] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = ["admin", "superadmin"].includes(user.role);
  const isSuperadmin = user.role === "superadmin";
  const isOwner =
    request.requester?._id === user.id ||
    request.requester?.toString?.() === user.id;

  async function perform(path, body = {}) {
    setBusy(true);
    setNotice("");
    setError("");

    try {
      const data = await supportRequest(path, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      setNotice(data.message || "Updated successfully.");
      await onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();

    if (!reply.trim()) return;

    setBusy(true);
    setNotice("");
    setError("");

    try {
      const data = await supportRequest(
        `/support/${request._id || request.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ message: reply.trim() }),
        },
      );

      setReply("");
      setNotice(data.message);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reassign(event) {
    event.preventDefault();

    if (!newAssignee) {
      setError("Select an Admin to reassign this request.");
      return;
    }

    await perform(`/support/${request._id || request.id}/reassign`, {
      newAssigneeId: newAssignee,
      note: reassignmentNote,
    });

    setNewAssignee("");
    setReassignmentNote("");
  }

  const canReply =
    !["resolved", "closed"].includes(request.status) && (isAdmin || isOwner);

  return (
    <section style={styles.panel}>
      <div style={styles.heading}>
        <div>
          <div style={{ ...styles.muted, textTransform: "uppercase" }}>
            SUPPORT REQUEST
          </div>
          <h3 style={{ ...styles.title, marginTop: 5 }}>{request.subject}</h3>
        </div>
        <Status value={request.status} />
      </div>

      <div style={styles.muted}>Request ID: {request._id || request.id}</div>

      <div style={{ marginTop: 15, lineHeight: 1.7, color: "#43516a" }}>
        {request.description}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
          marginTop: 15,
          fontSize: 12,
          color: "#8290a5",
        }}
      >
        <span>Category: {request.category}</span>
        <span>Submitted: {new Date(request.createdAt).toLocaleString()}</span>
      </div>

      {isAdmin && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 9,
            background: "#f6f8fc",
            fontSize: 13,
          }}
        >
          <strong>Requester:</strong>{" "}
          {request.requesterName || request.requester?.name || "Unknown"}
          <br />
          <strong>Email:</strong>{" "}
          {request.requesterEmail || request.requester?.email || "—"}
          <br />
          <strong>Assigned to:</strong>{" "}
          {request.assignedTo?.name || "Unassigned"}
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <h4
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "0 0 12px",
            color: "#25334a",
          }}
        >
          <MessageSquare size={17} /> Conversation
        </h4>

        {(request.messages || []).length === 0 ? (
          <p style={styles.muted}>No replies yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {request.messages.map((message, index) => (
              <div
                key={message._id || index}
                style={{
                  background: "#f6f8fc",
                  borderRadius: 9,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ fontSize: 13, color: "#34445e" }}>
                    {message.senderName}
                    <span style={{ color: "#8290a5", fontWeight: 400 }}>
                      {" "}
                      · {message.senderRole}
                    </span>
                  </strong>
                  <span style={{ ...styles.muted, fontSize: 11 }}>
                    {message.createdAt
                      ? new Date(message.createdAt).toLocaleString()
                      : ""}
                  </span>
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "#43516a",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {canReply && (
        <form onSubmit={sendReply} style={{ marginTop: 18 }}>
          <label style={styles.label}>Write a reply</label>
          <textarea
            style={{ ...styles.input, minHeight: 85, resize: "vertical" }}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={3000}
            placeholder="Type your message..."
            required
          />
          <button style={styles.primary} disabled={busy || !reply.trim()}>
            <Send size={15} /> Send reply
          </button>
        </form>
      )}

      {isAdmin && request.status === "open" && !request.assignedTo && (
        <div style={{ marginTop: 18 }}>
          <button
            style={styles.primary}
            disabled={busy}
            onClick={() =>
              perform(`/support/${request._id || request.id}/claim`)
            }
          >
            <UserCheck size={16} /> Claim this request
          </button>
        </div>
      )}

      {isAdmin &&
        request.assignedTo &&
        !["resolved", "closed"].includes(request.status) && (
          <div style={{ marginTop: 18 }}>
            <button
              style={styles.secondary}
              disabled={busy}
              onClick={() =>
                perform(`/support/${request._id || request.id}/resolve`)
              }
            >
              <CheckCircle2 size={16} /> Resolve request
            </button>
          </div>
        )}

      {isSuperadmin &&
        request.assignedTo &&
        ["claimed", "in_progress"].includes(request.status) && (
          <form
            onSubmit={reassign}
            style={{
              marginTop: 20,
              padding: 14,
              background: "#f6f8fc",
              borderRadius: 10,
            }}
          >
            <strong
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 14,
              }}
            >
              <ArrowRightLeft size={16} /> Reassign request
            </strong>
            <p style={styles.muted}>
              Only Superadmin can reassign an already claimed request.
            </p>

            <label style={styles.label}>New Admin</label>
            <select
              style={styles.input}
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              required
            >
              <option value="">Select an Admin</option>
              {admins
                .filter(
                  (admin) =>
                    admin.active &&
                    admin.role === "admin" &&
                    (admin.id || admin._id) !==
                      (request.assignedTo?.id || request.assignedTo?._id),
                )
                .map((admin) => {
                  const adminId = admin.id || admin._id;

                  return (
                    <option key={adminId} value={adminId}>
                      {admin.name}
                    </option>
                  );
                })}
            </select>

            <label style={styles.label}>Reason (optional)</label>
            <input
              style={styles.input}
              value={reassignmentNote}
              onChange={(e) => setReassignmentNote(e.target.value)}
              maxLength={500}
              placeholder="Reason for reassignment"
            />

            <button style={styles.primary} disabled={busy || !newAssignee}>
              <ArrowRightLeft size={15} /> Reassign
            </button>
          </form>
        )}

      {(request.assignmentHistory || []).length > 0 && isAdmin && (
        <details style={{ marginTop: 20 }}>
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              color: "#43516a",
            }}
          >
            Assignment history
          </summary>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {request.assignmentHistory.map((item, index) => (
              <div
                key={item._id || index}
                style={{
                  padding: 10,
                  borderLeft: "3px solid #315ee7",
                  background: "#f6f8fc",
                  fontSize: 12,
                  color: "#43516a",
                }}
              >
                <strong>{item.action}</strong> by {item.performedByName}
                <div style={styles.muted}>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : ""}
                </div>
                {item.note && <div>Reason: {item.note}</div>}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

export default function SupportCentre({ user }) {
  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      const endpoint = isAdmin ? "/support" : "/support/mine";
      const data = await supportRequest(endpoint);

      setRequests(data.requests || []);

      if (
        selectedId &&
        !data.requests?.some((item) => (item._id || item.id) === selectedId)
      ) {
        setSelectedId("");
      }
    } catch (err) {
      setError(err.message);
    }
  }, [isAdmin, selectedId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (user?.role !== "superadmin") return;

    async function loadAdmins() {
      try {
        const data = await supportRequest("/team");
        setAdmins(data.members || []);
      } catch (err) {
        setError(err.message);
      }
    }

    loadAdmins();
  }, [user?.role]);

  async function submitRequest(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");

    try {
      const data = await supportRequest("/support", {
        method: "POST",
        body: JSON.stringify({
          subject,
          category,
          description,
        }),
      });

      setSubject("");
      setCategory("other");
      setDescription("");
      setNotice(data.message || "Support request submitted.");
      await loadRequests();
      setSelectedId(data.request?._id || data.request?.id || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filteredRequests = requests.filter((item) => {
    return filter === "all" || item.status === filter;
  });

  const selectedRequest = requests.find(
    (item) => (item._id || item.id) === selectedId,
  );

  return (
    <div style={styles.page}>
      <div style={styles.heading}>
        <div>
          <div
            style={{
              ...styles.muted,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
            }}
          >
            QUEUEWISE HELP DESK
          </div>
          <h2 style={{ ...styles.title, marginTop: 5 }}>
            <Headset
              size={22}
              style={{ verticalAlign: "middle", marginRight: 8 }}
            />
            Support Centre
          </h2>
          <p style={styles.muted}>
            {isAdmin
              ? "Review, claim and resolve support requests."
              : "Submit a request and follow its progress."}
          </p>
        </div>

        <button style={styles.secondary} onClick={loadRequests} disabled={busy}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#fff1f0",
            color: "#b42318",
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} style={{ verticalAlign: "middle" }} /> {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#ecfdf3",
            color: "#067647",
            fontSize: 13,
          }}
        >
          <CheckCircle2 size={15} style={{ verticalAlign: "middle" }} />{" "}
          {notice}
        </div>
      )}

      {!isAdmin && (
        <section style={styles.panel}>
          <h3 style={{ ...styles.title, fontSize: 17 }}>
            <Plus size={18} style={{ verticalAlign: "middle" }} /> Create a
            support request
          </h3>
          <p style={styles.muted}>
            Describe the issue clearly. You can track replies and updates here.
          </p>

          <form onSubmit={submitRequest}>
            <label style={styles.label}>Subject</label>
            <input
              style={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              placeholder="Briefly describe your issue"
              required
            />

            <label style={styles.label}>Category</label>
            <select
              style={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <label style={styles.label}>Description</label>
            <textarea
              style={{ ...styles.input, minHeight: 110, resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={3000}
              placeholder="Explain what happened and what help you need..."
              required
            />

            <button style={styles.primary} disabled={busy}>
              <Send size={15} />
              {busy ? "Submitting..." : "Submit request"}
            </button>
          </form>
        </section>
      )}

      <div style={styles.grid}>
        <section style={styles.panel}>
          <div style={styles.heading}>
            <h3 style={{ ...styles.title, fontSize: 17 }}>
              {isAdmin ? "All support requests" : "My requests"}
            </h3>
            <span style={styles.muted}>{requests.length} total</span>
          </div>

          <label style={styles.label}>Filter by status</label>
          <select
            style={styles.input}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All requests</option>
            <option value="open">Open</option>
            <option value="claimed">Claimed</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {filteredRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 25 }}>
              <Clock3 size={25} color="#9aa7b8" />
              <p style={styles.muted}>No support requests found.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 9 }}>
              {filteredRequests.map((item) => {
                const id = item._id || item.id;
                const active = selectedId === id;

                return (
                  <button
                    key={id}
                    onClick={() => setSelectedId(id)}
                    style={{
                      textAlign: "left",
                      border: active
                        ? "1px solid #315ee7"
                        : "1px solid #e8edf5",
                      background: active ? "#f3f6ff" : "#fff",
                      borderRadius: 9,
                      padding: 12,
                      cursor: "pointer",
                      color: "#25334a",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>{item.subject}</strong>
                      <Status value={item.status} />
                    </div>
                    {isAdmin && (
                      <div style={{ ...styles.muted, marginTop: 5 }}>
                        {item.requesterName || item.requester?.name || "User"}
                      </div>
                    )}
                    <div style={{ ...styles.muted, marginTop: 5 }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div>
          {selectedRequest ? (
            <RequestDetails
              request={selectedRequest}
              user={user}
              onRefresh={loadRequests}
              setNotice={setNotice}
              setError={setError}
              admins={admins}
            />
          ) : (
            <section style={{ ...styles.panel, textAlign: "center" }}>
              <MessageSquare size={28} color="#9aa7b8" />
              <h3 style={{ color: "#34445e", fontSize: 16 }}>
                Select a request
              </h3>
              <p style={styles.muted}>
                Choose a request from the list to view its details and
                conversation.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
