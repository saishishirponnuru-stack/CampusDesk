import jwt from "jsonwebtoken";
import { Admin } from "../models/index.js";
export const fail = (status, message) =>
  Object.assign(new Error(message), { status });
export const sign = (admin, secret) =>
  jwt.sign({ version: admin.tokenVersion }, secret, {
    subject: String(admin._id),
    expiresIn: "15m",
    issuer: "campusdesk",
    audience: "campusdesk-admin",
  });
export function authenticate(secret) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      if (!token) throw fail(401, "Please sign in");
      let payload;
      try {
        payload = jwt.verify(token, secret, {
          issuer: "campusdesk",
          audience: "campusdesk-admin",
          algorithms: ["HS256"],
        });
      } catch {
        throw fail(401, "Session expired. Please sign in again");
      }
      const admin = await Admin.findById(payload.sub);
      if (!admin || admin.tokenVersion !== payload.version)
        throw fail(401, "Session expired. Please sign in again");
      req.admin = admin;
      next();
    } catch (e) {
      next(e);
    }
  };
}
