const { PrismaClient } = require('@prisma/client');

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

/**
 * Prisma Client Extension para Soft Deletes (Reglas.MD - Sección 2.1)
 * Intercepta delete / deleteMany y los convierte en updates con deletedAt = new Date().
 * Filtra automáticamente registros no eliminados en findMany, findFirst y count.
 */
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async delete({ model, args }) {
        return basePrisma[model].update({
          where: args.where,
          data: { deletedAt: new Date() },
        });
      },
      async deleteMany({ model, args }) {
        return basePrisma[model].updateMany({
          where: args.where,
          data: { deletedAt: new Date() },
        });
      },
      async findMany({ model, args, query }) {
        args.where = { ...args.where };
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        args.where = { ...args.where };
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
      async count({ model, args, query }) {
        args.where = { ...args.where };
        if (args.where.deletedAt === undefined) {
          args.where.deletedAt = null;
        }
        return query(args);
      },
    },
  },
});

module.exports = { prisma, basePrisma };
