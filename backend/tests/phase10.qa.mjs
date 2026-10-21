import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../app.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import FuelRecord from "../models/FuelRecord.js";
import Trip from "../models/Trip.js";
import Budget from "../models/Budget.js";
import Notification from "../models/Notification.js";
import { buildCrisisRecommendations, pakistanToday } from "../services/crisisRecommendations.js";
import { estimateRoutes, routePlanStore, vehicleFingerprint } from "../services/routePlanning.js";

dotenv.config();
const dbName = `smartfuel_phase10_qa_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
let server;
let connected = false;
let checks = 0;

const expect = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks += 1;
};

try {
  assert.ok(process.env.MONGO_URI && process.env.JWT_SECRET, "QA requires the existing backend environment");
  await mongoose.connect(process.env.MONGO_URI, { dbName });
  connected = true;
  assert.equal(mongoose.connection.name, dbName, "QA must use its isolated database");
  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (method, path, token, body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  const get = (path, token) => request("GET", path, token);
  const post = (path, token, body) => request("POST", path, token, body);
  const put = (path, token, body) => request("PUT", path, token, body);
  const patch = (path, token, body) => request("PATCH", path, token, body);
  const del = (path, token) => request("DELETE", path, token);

  const member = (email, role) => ({ fullName: `QA ${role}`, email, contactNumber: "03001234567", role, password: "Testpass123" });
  const a = member(`qa-a-${dbName}@example.test`, "Individual");
  const b = member(`qa-b-${dbName}@example.test`, "Organizational");
  expect((await post("/auth/register", null, { ...a, email: "invalid" })).status, 400, "invalid email");
  expect((await post("/auth/register", null, { ...a, password: "short" })).status, 400, "short password");
  expect((await post("/auth/register", null, { ...a, password: "NoDigitsHere" })).status, 400, "password requires number");
  expect((await post("/auth/register", null, { ...a, fullName: " " })).status, 400, "blank full name");
  expect((await post("/auth/register", null, { ...a, role: "Admin" })).status, 400, "Admin cannot self-register");
  const registeredA = await post("/auth/register", null, a);
  const registeredB = await post("/auth/register", null, b);
  expect(registeredA.status, 201, "Individual registration");
  expect(registeredB.status, 201, "Organizational registration");
  expect((await post("/auth/register", null, a)).status, 400, "duplicate email");
  expect((await post("/auth/login", null, { email: a.email, password: "Wrong123" })).status, 401, "wrong password");
  expect((await post("/auth/login", null, { email: a.email, password: 12345678 })).status, 400, "malformed password");
  expect((await post("/auth/login", null, { email: "unknown@example.test", password: a.password })).status, 401, "unknown account");
  const tokenA = (await post("/auth/login", null, { email: a.email, password: a.password })).data.token;
  const tokenB = (await post("/auth/login", null, { email: b.email, password: b.password })).data.token;
  assert.ok(tokenA && tokenB);
  expect((await get("/profile")).status, 401, "missing token");
  expect((await get("/profile", "malformed.qa.token")).status, 401, "malformed token");
  const expired = jwt.sign({ id: registeredA.data.user.id }, process.env.JWT_SECRET, { expiresIn: -1 });
  expect((await get("/profile", expired)).status, 401, "expired token");
  expect((await get("/profile", tokenA)).status, 200, "authenticated profile");
  expect((await put("/profile", tokenA, { fullName: "QA Individual Updated" })).status, 200, "profile update");
  expect((await put("/profile", tokenA, { password: "weak" })).status, 400, "weak profile password denied");
  expect((await post("/auth/logout", tokenA)).status, 200, "logout response");

  const adminA = await User.create({ fullName: "QA Admin A", email: `qa-admin-a-${dbName}@example.test`, contactNumber: "03001234567", role: "Admin", password: await bcrypt.hash("Testpass123", 10) });
  const adminB = await User.create({ fullName: "QA Admin B", email: `qa-admin-b-${dbName}@example.test`, contactNumber: "03001234567", role: "Admin", password: await bcrypt.hash("Testpass123", 10) });
  const adminToken = (await post("/auth/login", null, { email: adminA.email, password: "Testpass123" })).data.token;
  expect((await get("/admin/stats", tokenA)).status, 403, "member cannot read Admin stats");
  expect((await get("/vehicles", adminToken)).status, 403, "Admin cannot use member vehicle API");
  expect((await get("/fuel-records", adminToken)).status, 403, "Admin cannot use member records API");
  expect((await get("/trips", adminToken)).status, 403, "Admin cannot use member trips API");

  const vehicle = (registrationNumber, fuelType) => ({ vehicleName: `QA ${fuelType}`, registrationNumber, manufacturer: "Toyota", modelYear: 2025, fuelType, fuelEfficiency: 12, fuelTankCapacity: 50 });
  const vehicleA = (await post("/vehicles", tokenA, vehicle(`QA-A-${dbName}`, "Petrol"))).data.vehicle;
  const vehicleB = (await post("/vehicles", tokenB, vehicle(`QA-B-${dbName}`, "Diesel"))).data.vehicle;
  const vehicleElectric = (await post("/vehicles", tokenA, vehicle(`QA-E-${dbName}`, "Electric"))).data.vehicle;
  assert.ok(vehicleA?._id && vehicleB?._id && vehicleElectric?._id);
  expect((await post("/vehicles", tokenA, vehicle(vehicleA.registrationNumber, "Petrol"))).status, 409, "duplicate registration");
  expect((await post("/vehicles", tokenA, { ...vehicle("QA-invalid", "Petrol"), fuelEfficiency: 0 })).status, 400, "invalid efficiency");
  expect((await get(`/vehicles/${vehicleB._id}`, tokenA)).status, 403, "vehicle ownership");
  expect((await get("/vehicles", tokenA)).data.vehicles.length, 2, "member vehicle list isolation");
  expect((await put(`/vehicles/${vehicleElectric._id}`, tokenA, { fuelEfficiency: 10 })).status, 200, "vehicle update");

  const year = 2026;
  const month = 10;
  const period = `/budgets/${year}/${month}`;
  expect((await get(`${period}/summary`, tokenA)).data.budget, null, "no-budget state");
  expect((await put(period, tokenA, { amount: 6000 })).status, 200, "budget creation");
  const record = (vehicleId, date, quantity, cost) => ({ vehicleId, date, quantity, cost });
  const recordA1 = (await post("/fuel-records", tokenA, record(vehicleA._id, "2026-10-01", 10, 2800))).data.record;
  const recordA2 = (await post("/fuel-records", tokenA, record(vehicleA._id, "2026-10-31", 20, 5600))).data.record;
  await post("/fuel-records", tokenA, record(vehicleA._id, "2026-11-01", 1, 100));
  await put(period, tokenB, { amount: 1000 });
  const recordB = (await post("/fuel-records", tokenB, record(vehicleB._id, "2026-10-15", 10, 9999))).data.record;
  assert.ok(recordA1?._id && recordA2?._id && recordB?._id);
  expect((await post("/fuel-records", tokenA, record(vehicleB._id, "2026-10-15", 1, 100))).status, 404, "foreign vehicle cannot receive record");
  expect((await post("/fuel-records", tokenA, record("bad-id", "2026-10-15", 1, 100))).status, 400, "malformed vehicle ID");
  expect((await get(`/fuel-records/${recordB._id}`, tokenA)).status, 404, "record ownership");
  const summary = (await get(`${period}/summary`, tokenA)).data;
  expect(summary.spent, 8400, "month boundaries and user spending isolation");
  expect(summary.remaining, -2400, "remaining budget");
  expect(summary.isExceeded, true, "exceeded budget");
  expect((await get("/budgets/2026/11/summary", tokenA)).data.spent, 100, "next month boundary");
  expect((await get(period, tokenB)).data.budget.amount, 1000, "budget ownership");
  expect((await get("/fuel-records", tokenA)).data.records.length, 3, "record list isolation");
  expect((await get(`/fuel-records?vehicleId=${vehicleB._id}`, tokenA)).status, 404, "record filter ownership");
  expect((await put(period, tokenA, { amount: 8400 })).status, 200, "budget update");
  expect((await get(`${period}/summary`, tokenA)).data.isExceeded, false, "equal budget is not over limit");
  const resolvedBudget = (await get("/notifications", tokenA)).data.notifications.find((item) => item.type === "BUDGET_EXCEEDED");
  expect(resolvedBudget.isResolved, true, "equal budget resolves exceeded notification");
  await put(period, tokenA, { amount: 6000 });
  const reactivatedBudget = (await get("/notifications", tokenA)).data.notifications.find((item) => item.type === "BUDGET_EXCEEDED");
  expect(reactivatedBudget.isResolved, false, "budget exceeded notification reactivates");
  expect(reactivatedBudget.isRead, false, "reactivated notification is unread");
  expect((await put(period, tokenA, { amount: 12000 })).status, 200, "budget update to under 80 percent");
  expect((await get(`${period}/summary`, tokenA)).data.percentageUsed, 70, "under 80 percent");
  expect((await put(period, tokenA, { amount: 10000 })).status, 200, "budget update to 80-99 percent");
  expect((await get(`${period}/summary`, tokenA)).data.percentageUsed, 84, "approaching budget");
  expect((await get(`/budgets/2026/11/previous`, tokenA)).data.budget.amount, 10000, "previous budget lookup");
  expect((await put("/budgets/2026/11", tokenA, { amount: 10000 })).status, 200, "future month can copy previous limit");
  expect(await Budget.countDocuments({ userId: registeredA.data.user.id, year: 2026, month: 11 }), 1, "copied month has one independent budget");
  expect((await get(period, tokenA)).data.budget.amount, 10000, "copy leaves previous month unchanged");

  const trip = (vehicleId, tripDate) => ({ vehicleId, startLocation: "Karachi Airport", destination: "Clifton Karachi", tripDate, priority: "Essential", status: "Planned" });
  const tripA = (await post("/trips", tokenA, trip(vehicleA._id, pakistanToday()))).data.trip;
  const tripB = (await post("/trips", tokenB, trip(vehicleB._id, pakistanToday()))).data.trip;
  assert.ok(tripA?._id && tripB?._id);
  expect((await post("/trips", tokenA, trip(vehicleB._id, pakistanToday()))).status, 404, "foreign vehicle cannot receive trip");
  expect((await get(`/trips/${tripB._id}`, tokenA)).status, 404, "trip ownership");
  expect((await get("/trips?priority=Essential&status=Planned", tokenA)).data.trips.length, 1, "trip filters");
  expect((await get("/trips/bad-id", tokenA)).status, 400, "malformed trip ID");
  expect((await del(`/vehicles/${vehicleA._id}`, tokenA)).status, 409, "linked vehicle cannot be orphaned");
  expect((await del(`/admin/vehicles/${vehicleB._id}`, adminToken)).status, 409, "Admin linked vehicle deletion controlled");

  const routeOptions = estimateRoutes([
    { distanceKm: 10, durationMinutes: 25 },
    { distanceKm: 12, durationMinutes: 20 },
  ], vehicleA);
  expect(routeOptions[0].isRecommended, true, "lowest resource route recommended");
  expect(routeOptions[1].isFastest, true, "fastest alternative identified");
  const planId = routePlanStore.put({
    userId: String(registeredA.data.user.id), tripId: tripA._id,
    tripVersion: new Date(tripA.updatedAt).toISOString(), vehicleFingerprint: vehicleFingerprint(vehicleA),
    start: { label: "Karachi Airport", coordinates: { lat: 24.9065, lng: 67.1608 } },
    destination: { label: "Clifton Karachi", coordinates: { lat: 24.8138, lng: 67.0299 } },
    calculatedAt: new Date().toISOString(), options: routeOptions,
  });
  const inefficient = await put(`/trips/${tripA._id}/route`, tokenA, { planId, optionId: routeOptions[1].id });
  expect(inefficient.status, 200, "save alternative route");
  expect(inefficient.data.trip.selectedRoute.wasLowestConsumption, false, "alternative identified as inefficient");
  const inefficientNotice = (await get("/notifications", tokenA)).data.notifications.find((item) => item.type === "INEFFICIENT_TRIP");
  expect(inefficientNotice?.isResolved, false, "inefficient route notification active");
  const saved = await put(`/trips/${tripA._id}/route`, tokenA, { planId, optionId: routeOptions[0].id });
  expect(saved.status, 200, "save selected route");
  expect(saved.data.trip.selectedRoute.wasLowestConsumption, true, "saved best-route metadata");
  expect((await get("/notifications", tokenA)).data.notifications.find((item) => item.type === "INEFFICIENT_TRIP").isResolved, true, "optimal route resolves inefficiency notice");
  expect((await put(`/trips/${tripB._id}/route`, tokenA, { planId, optionId: routeOptions[0].id })).status, 404, "route ownership");
  const edited = await put(`/trips/${tripA._id}`, tokenA, { startLocation: "Different Karachi start" });
  expect(edited.status, 200, "trip update");
  expect(edited.data.trip.selectedRoute, undefined, "changed start invalidates route");
  await Trip.findByIdAndUpdate(tripA._id, { selectedRoute: saved.data.trip.selectedRoute });
  expect((await put(`/trips/${tripA._id}`, tokenA, { destination: "Different Karachi destination" })).data.trip.selectedRoute, undefined, "changed destination invalidates route");
  await Trip.findByIdAndUpdate(tripA._id, { selectedRoute: saved.data.trip.selectedRoute });
  expect((await put(`/trips/${tripA._id}`, tokenA, { vehicleId: vehicleElectric._id })).data.trip.selectedRoute, undefined, "changed vehicle invalidates route");
  await put(`/trips/${tripA._id}`, tokenA, { vehicleId: vehicleA._id });
  expect((await put("/crisis-mode", tokenA, { enabled: true })).status, 200, "Crisis Mode enabled");
  const crisis = await get("/crisis-mode/recommendations", tokenA);
  expect(crisis.status, 200, "Crisis recommendations available");
  expect(crisis.data.recommendations.some((item) => item.type === "PLAN_ROUTE"), true, "route planning recommendation");
  const noActions = buildCrisisRecommendations([{ _id: "one", vehicleId: vehicleA._id, tripDate: new Date(`${pakistanToday()}T00:00:00.000Z`), status: "Planned", priority: "Essential", selectedRoute: saved.data.trip.selectedRoute }], [vehicleA]);
  expect(noActions.recommendations.length, 0, "optimized essential route has no redundant action");
  const crisisTrip = { _id: "first", vehicleId: vehicleA._id, tripDate: new Date(`${pakistanToday()}T00:00:00.000Z`), status: "Planned", priority: "Normal", startLocation: "A", destination: "B" };
  expect(buildCrisisRecommendations([{ ...crisisTrip, priority: "Non-essential" }], [vehicleA]).recommendations[0].type, "POSTPONE_NON_ESSENTIAL", "non-essential trip recommends postponement");
  expect(buildCrisisRecommendations([{ ...crisisTrip, status: "Completed" }, { ...crisisTrip, _id: "cancelled", status: "Cancelled" }, { ...crisisTrip, _id: "past", tripDate: new Date("2020-01-01T00:00:00.000Z") }], [vehicleA]).recommendations.length, 0, "past and inactive trips have no actions");
  expect(buildCrisisRecommendations([crisisTrip, crisisTrip], [vehicleA]).recommendations.length, 1, "duplicate trip input deduplicates actions");
  expect(buildCrisisRecommendations([{ ...crisisTrip, selectedRoute: saved.data.trip.selectedRoute }], [{ ...vehicleA, fuelEfficiency: 14 }]).recommendations[0].type, "PLAN_ROUTE", "stale efficiency prompts replanning");
  const compatible = [
    { ...crisisTrip, startCoordinates: { lat: 24.86, lng: 67 }, destinationCoordinates: { lat: 24.88, lng: 67.02 } },
    { ...crisisTrip, _id: "second", startCoordinates: { lat: 24.8805, lng: 67.0205 }, destinationCoordinates: { lat: 24.9, lng: 67.04 } },
  ];
  expect(buildCrisisRecommendations(compatible, [vehicleA]).recommendations.some((item) => item.type === "COMBINE_TRIPS"), true, "compatible nearby trips can be combined");

  const notifications = await get("/notifications", tokenA);
  expect(notifications.status, 200, "notifications list");
  expect(notifications.data.notifications.some((item) => item.type === "BUDGET_EXCEEDED"), true, "budget notification persisted");
  const foreignNotification = (await get("/notifications", tokenB)).data.notifications[0];
  assert.ok(foreignNotification?._id);
  expect((await patch(`/notifications/${foreignNotification._id}/read`, tokenA)).status, 404, "notification ownership");
  expect((await patch("/notifications/read-all", tokenA)).status, 200, "mark all notifications read");
  expect((await get("/notifications/unread-count", tokenA)).data.unreadCount, 0, "unread count after mark all");

  const stats = await get("/admin/stats", adminToken);
  expect(stats.data.stats.totalUsers, 4, "Admin total includes current Admin");
  expect(stats.data.stats.totalAdmins, 2, "Admin count");
  const manageable = await get("/admin/users", adminToken);
  expect(manageable.data.users.length, 3, "current Admin excluded from Manage Users");
  expect(manageable.data.users.some((user) => String(user._id) === String(adminB._id)), true, "other Admin visible");
  expect((await put(`/admin/users/${adminA._id}`, adminToken, { role: "Individual" })).status, 400, "self role change denied");
  expect((await del(`/admin/users/${adminA._id}`, adminToken)).status, 400, "self deletion denied");
  expect((await get("/admin/vehicles", adminToken)).data.vehicles.length, 3, "Admin vehicle list");
  expect((await put(`/fuel-records/${recordA1._id}`, tokenA, { cost: 3000 })).status, 200, "fuel record update");
  expect((await get(`${period}/summary`, tokenA)).data.spent, 8600, "edited record recalculates spending");
  expect((await del(`/fuel-records/${recordA1._id}`, tokenA)).status, 200, "fuel record deletion");
  expect((await get(`${period}/summary`, tokenA)).data.spent, 5600, "deleted record recalculates spending");
  expect((await del(`/vehicles/${vehicleElectric._id}`, tokenA)).status, 200, "unlinked vehicle deletion");
  expect((await del(`/admin/users/${registeredB.data.user.id}`, adminToken)).status, 200, "Admin deletes another user's account");
  const removedUserId = registeredB.data.user.id;
  for (const model of [User, Vehicle, FuelRecord, Trip, Budget, Notification]) {
    const filter = model === User ? { _id: removedUserId } : { userId: removedUserId };
    expect(await model.countDocuments(filter), 0, `${model.modelName} records cleared with deleted user`);
  }
  expect((await get("/profile", tokenB)).status, 401, "deleted account token no longer authenticates");
  expect((await get("/admin/stats", adminToken)).data.stats.totalUsers, 3, "Admin stats update after account deletion");

  console.log(`Phase 10 isolated API QA passed: ${checks} assertions`);
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (connected) {
    if (mongoose.connection.name !== dbName || !dbName.startsWith("smartfuel_phase10_qa_")) {
      throw new Error("QA cleanup refused: database name did not match isolated QA database");
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}
