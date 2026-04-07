import { Service } from "typedi";
import { AppDataSource } from "../config/data-source.js";
import { Tag } from "../models/tag.model.js";
import { DriverTag } from "../models/driverTag.model.js";

@Service()
export default class TagService {
    private tagRepository = AppDataSource.getRepository(Tag);
    private driverTagRepository = AppDataSource.getRepository(DriverTag);

    async getAllTags() {
        return await this.tagRepository.find();
    }

    async createTag(name: string) {
        const existingTag = await this.tagRepository.findOneBy({ name });
        if (existingTag) {
            throw new Error('Tag with this name already exists');
        }
        const tag = this.tagRepository.create({ name });
        return await this.tagRepository.save(tag);
    }

    async getTagById(tagId: string) {
        const tag = await this.tagRepository.findOneBy({ id: tagId });
        if (!tag) {
            throw new Error(`Tag with ID ${tagId} not found`);
        }
        return tag;
    }

    async updateTag(tagId: string, name: string) {
        const tag = await this.tagRepository.findOneBy({ id: tagId });
        if (!tag) {
            throw new Error(`Tag with ID ${tagId} not found`);
        }
        const existingTag = await this.tagRepository.findOneBy({ name });
        if (existingTag && existingTag.id !== tagId) {
            throw new Error('Another tag with this name already exists');
        }
        tag.name = name;
        return await this.tagRepository.save(tag);
    }

    async attachTagsToDrivers(driverIds: string[], tags: string[]) {
        const driverTags = [];
        for (const driverId of driverIds) {
            for (const tagName of tags) {
                const existingDriverTag = await this.driverTagRepository.findOne({
                    where: { driver: { id: driverId }, tag: { name: tagName } }
                })
                if (existingDriverTag) {
                    continue; // Skip if the tag is already attached to the driver
                }
                let tag = await this.tagRepository.findOneBy({ name: tagName });
                if (!tag) {
                    // If the tag doesn't exist, create it first
                    const newTag = this.tagRepository.create({ name: tagName });
                    await this.tagRepository.save(newTag);
                    tag = newTag;
                }
                const driverTag = this.driverTagRepository.create({ driver: { id: driverId } as any, tag });
                driverTags.push(driverTag);
            }
        }
        if (driverTags.length > 0) {
            await this.driverTagRepository.save(driverTags);
        }
        return driverTags;
    }

    async detachTagsFromDrivers(driverIds: string[], tagIds: string[]) {
        const driverTagsToRemove = [];
        for (const driverId of driverIds) {
            for (const tagId of tagIds) {
                const driverTag = await this.driverTagRepository.findOne({
                    where: { driver: { id: driverId }, tag: { id: tagId } }
                });
                if (driverTag) {
                    driverTagsToRemove.push(driverTag);
                }
            }
        }
        if (driverTagsToRemove.length > 0) {
            await this.driverTagRepository.remove(driverTagsToRemove);
        }
        return driverTagsToRemove;
    }
}