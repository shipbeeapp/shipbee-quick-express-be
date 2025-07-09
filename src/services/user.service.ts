import { Service, Container } from "typedi";
import { User } from "../models/user.model.js";
import { AppDataSource } from "../config/data-source.js";

@Service()
export default class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async findOrCreateUser(data: any, queryRunner?: any): Promise<User> {
    try {
      const manager = queryRunner ? queryRunner.manager.getRepository(User) : this.userRepository;
      let user;
      console.log("findOrCreateUser called with data:", data);
      if (data.email && data.phoneNumber) {
        user = await this.userRepository
          .createQueryBuilder('user')
          .where('user.email = :email', { email: data.email })
          .orWhere('user.phoneNumber = :phoneNumber', { phoneNumber: data.phoneNumber })
          .getOne();
      } else if (data.email) {
        user = await this.userRepository.findOneBy({ email: data.email });
      } else if (data.phoneNumber) {
        user = await this.userRepository.findOneBy({ phoneNumber: data.phoneNumber });
      } else {
        throw new Error('Either email or phoneNumber must be provided');
      }
      if (!user) {
          console.log("User not found, creating new user with data:", data);
          user = manager.create(data);
          await manager.save(user);
      }
      return user;
  } catch (error) {
    console.log(error);
  }
}

  async saveUser(user: User): Promise<User> {
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  }
}