import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { Socket } from 'node:net';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }
  const family = process.env.DATABASE_IP_FAMILY ? Number(process.env.DATABASE_IP_FAMILY) : undefined;
  if (family !== undefined && family !== 4 && family !== 6) throw new Error('DATABASE_IP_FAMILY must be 4 or 6 when configured.');
  const options = {
    connectionString, connectionTimeoutMillis: 20000, max: 10,
    ...(family ? { stream: () => {
      const socket = new Socket();
      const connect = socket.connect.bind(socket);
      // pg connects streams with (port, host). Keep the hostname for TLS verification.
      socket.connect = ((port: number, host?: string) => connect({ port, host, family })) as typeof socket.connect;
      return socket;
    } } : {}),
  };
  const adapter = new PrismaPg(options);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
