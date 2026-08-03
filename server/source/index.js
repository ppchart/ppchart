const Base = require('./base')

class Chart extends Base {
    constructor(props) {
        super(props)
    }

    findMany({ current, pageSize, conditions }) {
        return this.findManyPagination({ current, pageSize, conditions })
    }

    addCount(cid) {
        return this.update({
            where: { cid },
            data: { viewCount: { increment: 1 }, },
        })
    }
}

class Mac extends Base {
    constructor(props) {
        super(props)
    }

    addOne(mac) {
        return this.add({ data: { mac, count: 1 }, })
    }

    recordVisit(mac) {
        return this.executeRaw`
            INSERT INTO \`mac\` (\`mac\`, \`count\`)
            VALUES (${mac}, 1)
            ON DUPLICATE KEY UPDATE \`count\` = IF(\`black\` = 0 OR \`id\` = 1, \`count\` + 1, \`count\`)
        `.then(() => this.findOneByMac(mac))
    }

    findOneByMac(mac) {
        return this.findFirst({ where: { mac } })
    }

    addCount(mac) {
        return this.update({
            where: { mac },
            data: { count: { increment: 1 }, },
        })
    }
    updateBlack(mac) {
        return this.update({
            where: { mac },
            data: { black: 1, },
        })
    }
}

class Black extends Base {
    constructor(props) {
        super(props)
    }
}

module.exports = {
    chart: new Chart({ name: 'chart' }),
    mac: new Mac({ name: 'mac' }),
    blackModel: new Black({ name: 'black' })
}
