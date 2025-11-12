import { Service, Container } from "typedi";
import { User } from "../models/user.model.js";
import { AppDataSource } from "../config/data-source.js";
import { toUserResponseDto, UserResponseDto } from "../resource/users/user.resource.js";

@Service()
export default class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async findOrCreateUser(data: any, queryRunner?: any): Promise<User> {
    const manager = queryRunner ? queryRunner.manager.getRepository(User) : this.userRepository;
    try {
      let user;
      console.log("findOrCreateUser called with data:", data);
      if (data.email && data.phoneNumber) {
        user = await manager
          .createQueryBuilder('user')
          .where('user.email = :email', { email: data.email })
          .orWhere('user.phoneNumber = :phoneNumber', { phoneNumber: data.phoneNumber })
          .getOne();
          console.log("User lookup by email and phoneNumber result:", user);
      } else if (data.email) {
        user = await manager.findOneBy({ email: data.email });
        console.log("User lookup by email result:", user);
      } else if (data.phoneNumber) {
        user = await manager.findOneBy({ phoneNumber: data.phoneNumber });
        console.log("User lookup by phoneNumber result:", user);
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
    if (error.code === '23505') {
      // Duplicate key error: try to fetch the user again
      console.log("Duplicate key error encountered, fetching existing user");
      const user =  await manager.findOneBy([
        { email: data.email },
        { phoneNumber: data.phoneNumber }
      ]);
      console.log("Fetched user after duplicate key error:", user);
      if (user) {
        return user;
      }
    }
    throw new Error(`Error in findOrCreateUser: ${error.message}`);
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

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    try {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      Object.assign(user, userData);
      return await this.userRepository.save(user);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findOneBy({ id: userId });
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      throw error;
    }
  }

  async getUsers(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userRepository.find({order: { createdAt: "DESC" }});
      return users.map(toUserResponseDto); 
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async getUserIdByApiKey(apiKey: string): Promise<string | undefined> {
    try {
      const user = await this.userRepository.findOneBy({ apiKey });
      return user ? user.id : undefined;
    } catch (error) {
      console.error("Error fetching user by API key:", error);
      throw error;
    }
  }

  async generateAndAssignApiKey(userId: string): Promise<string> {
    try {
      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      const apiKey = this.generateApiKey();
      user.apiKey = apiKey;
      await this.userRepository.save(user);
      return apiKey;
    } catch (error) {
      console.error("Error generating and assigning API key:", error);
      throw error;
    }
  }

  private generateApiKey(): string {
    // Simple API key generation using random bytes
    return [...Array(30)].map(() => Math.random().toString(36)[2]).join('');
  }
}