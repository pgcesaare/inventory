const { model } = require('../db/libs/sequelize')
const calculateDaysOnFeed = require('../utils/daysOnFeed')

class CalvesService {
    constructor(){
    }
    
    async create(data) {
            
        const newCalf = await model.Calves.create({...data})
        return newCalf

    }

    async findAll() {
        const calves = await model.Calves.findAll()
        return calves
    }

    async findAllbyRanch(ranchId) {
        const calves = await model.Calves.findAll({
            where: { originRanchID: ranchId },
            include: { all: true }
        })
        return calves
    }

    async findInventoryByRanch(ranchId) {
        const data = await model.Calves.findAll({
            where: { 
                currentRanchID: ranchId,
                status: "feeding",
                
            },
            include: [{ all: true }]
        })

        return data
    }
    
    async findOne(id){
        const calf = await model.Calves.findByPk(id, {
            include: [ {
                model: model.CalfLoads,
                as: 'calfLoads',
                include: [{
                    model: model.Loads,
                    as: 'load'
                }]
            }]
        }
        )
        return calf
    }

    async update(id, changes) {
        const model = await this.findOne(id)
        const rta = await model.update(changes)
        return rta
    }

    async delete(id) {
        const calf = await this.findOne(id)
        await calf.destroy()
        return { id }
      }
}

module.exports = CalvesService