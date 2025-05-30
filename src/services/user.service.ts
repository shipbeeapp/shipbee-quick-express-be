import { Service } from "typedi";
import { User } from "../models/user.model.js";

@Service()
export default class UserService {

  async findOrCreateUser(data: any, queryRunner: any): Promise<User> {
    try {
    let user = await queryRunner.manager.findOne(User, {
      where: [
        { email: data.email },
        { phoneNumber: data.phoneNumber }
    ], });
    if (!user) {
      user = queryRunner.manager.create(User, data);
      await queryRunner.manager.save(User, user);
    }
    return user;
  } catch (error) {
    console.log(error);
  }
}
}