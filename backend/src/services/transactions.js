import mongoose from "mongoose";
import { writeExclusive } from "./records.js";
import { fail } from "../middleware/auth.js";
export async function capabilities() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  return {
    atomicBatches: !!hello.setName || hello.msg === "isdbgrid",
    maxAttendance: 100,
    maxImportRows: 100,
    maxImportBytes: 65536,
  };
}
export async function atomic(operation) {
  try {
    return await writeExclusive(() =>
      mongoose.connection.transaction(operation, {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }),
    );
  } catch (error) {
    if ([20, 303].includes(error.code))
      throw Object.assign(
        fail(
          503,
          "Atomic batch operations require a MongoDB replica set. Individual record operations remain available.",
        ),
        { publicMessage: true },
      );
    throw error;
  }
}
export function invalid(status, message, issues) {
  return Object.assign(fail(status, message), { issues });
}
