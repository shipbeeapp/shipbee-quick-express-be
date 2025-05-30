import { Service } from 'typedi';
import { ServiceSubcategory } from '../models/serviceSubcategory.model.js';
import { furnitureRequests } from '../utils/enums/furnitureRequests.enum.js';

@Service()
export default class ServiceSubcategoryService {

    async findServiceSubcategoryByName(name: string, type: string, queryRunner: any) {
        try {
            if (type) {
                const isValidType = Object.values(furnitureRequests).includes(type as furnitureRequests);
                if (!isValidType) {
                    throw new Error(`Invalid type: ${type}`);
                }
                const subcategory = await queryRunner.manager.findOne(ServiceSubcategory, {
                    where: { name, type },
                });
                if (!subcategory) {
                    throw new Error(`Incompatible subcategory name: ${name} and type: ${type}`);
                }
                return subcategory;
            }
            return await queryRunner.manager.findOne(ServiceSubcategory, {  where: { name } });
        } catch (error) {
            // console.log(error);
            throw new Error(`Error finding service subcategory: ${error.message}`);
        }
    }
}