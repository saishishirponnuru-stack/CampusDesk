import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { MongoMemoryServer, MongoMemoryReplSet } from "mongodb-memory-server";

export function isolatedURI(value) {
  const url = new URL(value);
  if (
    url.protocol !== "mongodb:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw new Error(
      "TEST_MONGODB_URI must be an unauthenticated loopback disposable MongoDB service, never Atlas",
    );
  return value;
}
export async function testDatabase({ replicaSet = false } = {}) {
  const service = process.env.TEST_MONGODB_URI;
  const server = service
    ? null
    : replicaSet
      ? await MongoMemoryReplSet.create({
          binary: { version: "7.0.24" },
          replSet: { count: 1 },
        })
      : await MongoMemoryServer.create({ binary: { version: "7.0.24" } });
  const uri = service ? isolatedURI(service) : server.getUri();
  const dbName = "campusdesk_test_" + randomUUID().replaceAll("-", "");
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
  return {
    async stop() {
      if (
        mongoose.connection.name !== dbName ||
        !dbName.startsWith("campusdesk_test_")
      )
        throw new Error(
          "Refusing cleanup outside this disposable test database",
        );
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      await server?.stop();
    },
  };
}
