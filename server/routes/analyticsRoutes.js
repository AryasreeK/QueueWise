import express from "express";
import QueueToken from "../models/QueueToken.js";
import Service from "../models/Service.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, allowRoles("admin", "superadmin"));

function validDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) ? date : null;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function minutesBetween(start, end) {
  if (!start || !end) return null;

  const minutes = (new Date(end) - new Date(start)) / 60000;

  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}

function getLocalParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

router.get("/", async (req, res, next) => {
  try {
    const { from, to, timeZone = "Asia/Kolkata" } = req.query;

    const startDate = validDate(from);
    const endDate = validDate(to);

    if (!startDate || !endDate || startDate > endDate) {
      return res.status(400).json({
        message: "Please provide a valid date range.",
      });
    }

    let safeTimeZone = timeZone;

    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: safeTimeZone,
      });
    } catch {
      safeTimeZone = "Asia/Kolkata";
    }

    const tokens = await QueueToken.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .select(
        "tokenNumber serviceId serviceName status createdAt servedAt completedAt cancelledAt",
      )
      .lean();

    const services = await Service.find()
      .select("id name prefix active")
      .sort({ createdAt: 1 })
      .lean();

    const statuses = {
      total: tokens.length,
      waiting: 0,
      serving: 0,
      completed: 0,
      skipped: 0,
      cancelled: 0,
      expired: 0,
    };

    const dailyMap = new Map();
    const hourlyMap = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      count: 0,
    }));

    const serviceMap = new Map();

    services.forEach((service) => {
      serviceMap.set(service.id, {
        serviceId: service.id,
        serviceName: service.name,
        total: 0,
        completed: 0,
        skipped: 0,
        cancelled: 0,
        waiting: 0,
        serving: 0,
      });
    });

    const waitingTimes = [];
    const serviceTimes = [];

    tokens.forEach((token) => {
      if (Object.prototype.hasOwnProperty.call(statuses, token.status)) {
        statuses[token.status] += 1;
      }

      const parts = getLocalParts(new Date(token.createdAt), safeTimeZone);

      const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
      const hour = Number(parts.hour);

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          total: 0,
          completed: 0,
        });
      }

      const daily = dailyMap.get(dateKey);
      daily.total += 1;

      if (token.status === "completed") {
        daily.completed += 1;
      }

      if (hourlyMap[hour]) {
        hourlyMap[hour].count += 1;
      }

      if (!serviceMap.has(token.serviceId)) {
        serviceMap.set(token.serviceId, {
          serviceId: token.serviceId,
          serviceName: token.serviceName || token.serviceId,
          total: 0,
          completed: 0,
          skipped: 0,
          cancelled: 0,
          waiting: 0,
          serving: 0,
        });
      }

      const service = serviceMap.get(token.serviceId);
      service.total += 1;

      if (Object.prototype.hasOwnProperty.call(service, token.status)) {
        service[token.status] += 1;
      }

      const waitingTime = minutesBetween(token.createdAt, token.servedAt);

      if (waitingTime !== null) {
        waitingTimes.push(waitingTime);
      }

      const serviceTime = minutesBetween(token.servedAt, token.completedAt);

      if (serviceTime !== null) {
        serviceTimes.push(serviceTime);
      }
    });

    const dailyTrend = [...dailyMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const serviceBreakdown = [...serviceMap.values()].sort(
      (a, b) => b.total - a.total,
    );

    const peakHours = hourlyMap.sort((a, b) => b.count - a.count);

    return res.json({
      range: {
        from: startDate,
        to: endDate,
        timeZone: safeTimeZone,
      },
      summary: statuses,
      averages: {
        waitingMinutes: Number(average(waitingTimes).toFixed(1)),
        serviceMinutes: Number(average(serviceTimes).toFixed(1)),
        waitingSamples: waitingTimes.length,
        serviceSamples: serviceTimes.length,
      },
      dailyTrend,
      serviceBreakdown,
      peakHours,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
