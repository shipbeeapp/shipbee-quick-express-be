import { Service } from "typedi";
import { Address } from "../models/address.model.js";
import { AppDataSource } from "../config/data-source.js";
@Service()
export class AddressService {
//   private addressRepository = AppDataSource.getRepository(Address);

  async createAddresses(fromAddr: any, toAddr: any, queryRunner: any): Promise<{ fromAddress: Address; toAddress: Address }> {
    try {
        const fromAddress = queryRunner.manager.create(Address, { ...fromAddr });
        const toAddress = queryRunner.manager.create(Address, { ...toAddr });

        await queryRunner.manager.save([fromAddress, toAddress]);

        return { fromAddress, toAddress };
    } catch (error) {
        console.log(error);
        throw new Error(`Error creating addresses: ${error.message}`);
    }
  }
}
