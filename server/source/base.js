const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = class Base {
    constructor({ name }) {
        this.model = prisma[name];
    }

    add(conditions) {
        return this.model.create(conditions)
    }

    findFirst(conditions) {
        return this.model.findFirst(conditions);
    }

    getCount(conditions) {
        return this.model.count(conditions)
    }

    findManyPagination({ current, pageSize, conditions = {} }) {
        return this.model.findMany({
            skip: (current - 1) * pageSize,
            take: pageSize,
            ...conditions
        })
    }
    update(conditions) {
        return this.model.update(conditions)
    }

    executeRaw(...conditions) {
        return prisma.$executeRaw(...conditions)
    }
}
