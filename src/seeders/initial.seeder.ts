import { AppDataSource } from "../config/data-source.js";
import { ServiceCategory } from "../models/serviceCategory.model.js";
import { ServiceSubcategory } from "../models/serviceSubcategory.model.js";
import { ServiceCategoryName } from "../utils/enums/serviceCategory.enum.js";
import { ServiceSubcategoryName } from "../utils/enums/serviceSubcategory.enum.js";
import { env } from "../config/environment.js";
import { furnitureRequests } from "../utils/enums/furnitureRequests.enum.js";

export const seedDatabase = async () => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log("🌱 Seeding Categories and Subcategories...");
    const categoryRepo = queryRunner.manager.getRepository(ServiceCategory);
    const subcategoryRepo = queryRunner.manager.getRepository(ServiceSubcategory);

    const categories = [
      { name: ServiceCategoryName.SERVICES, subcategories: [
        ServiceSubcategoryName.PERSONAL_QUICK,
        ServiceSubcategoryName.FURNITURE_MOVING,
        ServiceSubcategoryName.COMMERCIAL_RETAIL,
        ServiceSubcategoryName.CONSTRUCTION,
        ServiceSubcategoryName.INTERNATIONAL,
      ] },
    ];

    for (const category of categories) {
      let existingCategory = await categoryRepo.findOne({ where: { name: category.name } });

      if (!existingCategory) {
        existingCategory = categoryRepo.create({ name: category.name });
        await categoryRepo.save(existingCategory);
      }

      for (const subcategory of category.subcategories) {
        const existingSubcategory = await subcategoryRepo.findOne({ where: { name: subcategory } });

        if (!existingSubcategory) {
          if (subcategory === ServiceSubcategoryName.FURNITURE_MOVING) {
            for (const request of Object.values(furnitureRequests)) {
              const newSubcategory = subcategoryRepo.create({ type: request, name: subcategory, serviceCategory: existingCategory});
              await subcategoryRepo.save(newSubcategory);
            }
          }
          else {
          const newSubcategory = subcategoryRepo.create({ name: subcategory, serviceCategory: existingCategory, baseCost: Number(env.BASE_COST), perLifterCost: Number(env.PER_LIFTER_COST) });
          await subcategoryRepo.save(newSubcategory);
          }
        }
      }
    }

    await queryRunner.commitTransaction();
    console.log("✅ Categories and Subcategories Seeded Successfully");
  } catch (error) {
    console.error("❌ Error Seeding Database:", error);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
  }
};