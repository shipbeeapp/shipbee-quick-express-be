import { Service } from "typedi";
import { Address } from "../models/address.model.js";
import { AppDataSource } from "../config/data-source.js";
@Service()
export class AddressService {
//   private addressRepository = AppDataSource.getRepository(Address);

  async createAddresses(fromAddr: any, toAddr: any, queryRunner: any): Promise<{ fromAddress: Address; toAddress: Address }> {
    try {
       console.log("Creating addresses with fromAddr:", fromAddr, "and toAddr:", toAddr);
        const fromAddress = queryRunner.manager.create(Address, { ...fromAddr });
        const toAddress = toAddr ? queryRunner.manager.create(Address, { ...toAddr }): null;
        console.log("Created toAddress:", toAddress);
        console.log("Created fromAddress:", fromAddress);

        if (toAddress) await queryRunner.manager.save([fromAddress, toAddress]);
        else await queryRunner.manager.save(fromAddress);

        return { fromAddress, toAddress };
    } catch (error) {
        console.log(error);
        throw new Error(`Error creating addresses: ${error.message}`);
    }
  }
}
