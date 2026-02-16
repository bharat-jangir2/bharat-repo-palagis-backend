import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { SuperAdmin, SuperAdminDocument } from '../entities/super-admin.entity';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(SuperAdmin.name)
    private readonly superAdminModel: Model<SuperAdminDocument>,
  ) {}

  async create(
    email: string,
    fullName: string,
    plainPassword: string,
  ): Promise<SuperAdmin> {
    const hashed = await bcrypt.hash(plainPassword, 10);
    const admin = new this.superAdminModel({
      email,
      fullName,
      password: hashed,
    });
    return admin.save();
  }

  async validateAdmin(
    email: string,
    password: string,
  ): Promise<SuperAdminDocument> {
    const admin = await this.superAdminModel
      .findOne({ email, isDeleted: false })
      .exec();

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return admin;
  }

  async findById(id: string): Promise<SuperAdminDocument> {
    const admin = await this.superAdminModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!admin) {
      throw new NotFoundException('Super admin not found');
    }

    return admin;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.superAdminModel.findByIdAndUpdate(id, {
      lastLoginAt: new Date(),
    });
  }

  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const admin = await this.findById(adminId);

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    admin.password = hashed;
    await admin.save();
  }

  async getProfile(id: string): Promise<Omit<SuperAdminDocument, 'password'>> {
    const admin = await this.findById(id);
    
    // Return profile without password
    const { password, ...profile } = admin.toObject();
    return profile as any;
  }

  async updateProfile(
    id: string,
    email?: string,
    fullName?: string,
  ): Promise<SuperAdminDocument> {
    const admin = await this.findById(id);

    // Check if email is being updated and if it conflicts with another admin
    if (email && email !== admin.email) {
      const existingAdmin = await this.superAdminModel
        .findOne({ email, isDeleted: false, _id: { $ne: admin._id } })
        .exec();

      if (existingAdmin) {
        throw new ConflictException('Email already exists');
      }
      admin.email = email;
    }

    if (fullName) {
      admin.fullName = fullName;
    }

    return admin.save();
  }
}

