import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../index.js";

describe("GET /api/healthz", () => {
  it("should return 200 OK and status 'ok'", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
