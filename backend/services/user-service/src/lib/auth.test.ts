import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requireAuth, requireAdmin, signToken, JwtPayload } from "./auth.js";

describe("Auth Middleware & Library Tests", () => {
  it("should sign and verify JWT tokens successfully", () => {
    const payload: JwtPayload = { userId: 1, email: "test@sunotal.com", role: "user" };
    const token = signToken(payload);
    expect(token).toBeDefined();
  });

  it("should reject requireAuth when Authorization header is missing", () => {
    const req = { headers: {} } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should permit requireAuth when a valid Bearer token is provided", () => {
    const payload: JwtPayload = { userId: 1, email: "user@sunotal.com", role: "user" };
    const token = signToken(payload);
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as Request & { user: JwtPayload }).user.email).toBe("user@sunotal.com");
  });

  it("should reject requireAdmin if the authenticated user is not an admin", () => {
    const payload: JwtPayload = { userId: 1, email: "user@sunotal.com", role: "user" };
    const token = signToken(payload);
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });
});
