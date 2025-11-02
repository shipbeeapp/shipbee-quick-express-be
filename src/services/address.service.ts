import { Service } from "typedi";
import { Address } from "../models/address.model.js";
@Service()
export class AddressService {
//   private addressRepository = AppDataSource.getRepository(Address);

  async createAddress(address: any, queryRunner: any): Promise<any> {
    try {
       console.log("Creating address");
       console.log("address data:", address);
        const addr = queryRunner.manager.create(Address, address);
        await queryRunner.manager.save(addr);
        console.log("address created:", addr);
        return addr;
    } catch (error) {
        console.log(error);
        throw new Error(`Error creating addresses: ${error.message}`);
    }
  }
}
