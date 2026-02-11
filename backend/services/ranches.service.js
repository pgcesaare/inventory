const { model } = require('../db/libs/sequelize')


class RanchesService {
    constructor(){
    }
    
    async create(data) {
            
        const newRanch = await model.Ranches.create({...data})
        return newRanch

    }

    async findAll() {
        const Ranches = await model.Ranches.findAll()
        return Ranches
    }

    
    async findOne(id){
        const Ranch = await model.Ranches.findByPk(id)
        return Ranch
    }

    async update(id, changes) {
        const model = await this.findOne(id)
        const rta = await model.update(changes)
        return rta
    }

    async delete(id) {
        const ranch = await this.findOne(id)
        await ranch.destroy()
        return { id }
      }
}

module.exports = RanchesService