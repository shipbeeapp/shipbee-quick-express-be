import { Service } from 'typedi';
import { ServiceSubcategory } from '../models/serviceSubcategory.model.js';

@Service()
export default class ServiceSubcategoryService {

    async findServiceSubcategoryByName(name: string, type: string, queryRunner: any) {
        try {
            return await queryRunner.manager.findOne(ServiceSubcategory, {  where: { name, type } });
        } catch (error) {
            console.log(error);
            throw new Error(`Error finding service subcategory: ${error.message}`);
        }
    }
}