export const services = [
  { id: "general", name: "General Enquiry", description: "Questions and information", prefix: "GE", avgMinutes: 5, color: "blue" },
  { id: "fees", name: "Fee Payment", description: "Payments and receipts", prefix: "FP", avgMinutes: 7, color: "violet" },
  { id: "certificate", name: "Certificate Verification", description: "Document verification", prefix: "CV", avgMinutes: 6, color: "amber" },
  { id: "lab", name: "Laboratory Assistance", description: "Lab access and support", prefix: "LA", avgMinutes: 10, color: "green" }
];

export const tokens = [];
const counters = Object.fromEntries(services.map(service => [service.id, 0]));

export function createToken(serviceId, customerName = "Guest") {
  const service = services.find(item => item.id === serviceId);
  if (!service) return null;
  counters[serviceId] += 1;
  const tokenNumber = `${service.prefix}-${String(counters[serviceId]).padStart(3, "0")}`;
  const token = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    tokenNumber,
    serviceId,
    serviceName: service.name,
    customerName: customerName.trim() || "Guest",
    status: "waiting",
    createdAt: new Date().toISOString(),
    servedAt: null,
    completedAt: null
  };
  tokens.push(token);
  return token;
}

export function queueSnapshot() {
  return services.map(service => {
    const serviceTokens = tokens.filter(token => token.serviceId === service.id);
    const waiting = serviceTokens.filter(token => token.status === "waiting");
    const serving = serviceTokens.find(token => token.status === "serving") || null;
    return {
      ...service,
      waitingCount: waiting.length,
      serving,
      waiting,
      totalCount: serviceTokens.length
    };
  });
}
