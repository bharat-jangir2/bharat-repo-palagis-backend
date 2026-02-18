import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DriverStatusLog,
  DriverStatusLogDocument,
  StatusLogEntry,
} from '../entities/driver-status-log.entity';
import { AccountStatus } from '../entities/driver.entity';

@Injectable()
export class DriverStatusLogService {
  constructor(
    @InjectModel(DriverStatusLog.name)
    private driverStatusLogModel: Model<DriverStatusLogDocument>,
  ) {}

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Log driver account status change
   * Called automatically when accountStatus is updated
   */
  async logStatusChange(
    driverId: string,
    accountStatus: AccountStatus,
  ): Promise<void> {
    const date = this.getTodayDateString();
    const timestamp = new Date();

    const statusLogEntry: StatusLogEntry = {
      status: accountStatus,
      timestamp,
    };

    // Convert driverId string to ObjectId
    const driverObjectId = new Types.ObjectId(driverId);

    await this.driverStatusLogModel.findOneAndUpdate(
      { driverId: driverObjectId, date },
      {
        $push: { statusLogs: statusLogEntry },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec();
  }

  /**
   * Get today's status log for a driver
   */
  async getTodaysStatusLog(driverId: string): Promise<DriverStatusLogDocument | null> {
    const date = this.getTodayDateString();
    const driverObjectId = new Types.ObjectId(driverId);
    return this.driverStatusLogModel.findOne({ driverId: driverObjectId, date }).exec();
  }

  /**
   * Calculate total active hours for today
   * Logic: Find ACTIVE status, then find subsequent INACTIVE status and calculate difference
   * Edge case: If last status is ACTIVE, calculate from that timestamp to now
   */
  async getTodaysActiveHours(driverId: string): Promise<{
    totalHours: number;
    totalMinutes: number;
    formatted: string;
    isCurrentlyActive: boolean;
  }> {
    const statusLog = await this.getTodaysStatusLog(driverId);

    if (!statusLog || !statusLog.statusLogs || statusLog.statusLogs.length === 0) {
      return {
        totalHours: 0,
        totalMinutes: 0,
        formatted: '0h 0m',
        isCurrentlyActive: false,
      };
    }

    const logs = statusLog.statusLogs;
    let totalMilliseconds = 0;
    let activeStartTime: Date | null = null;
    const now = new Date();

    // Check if last status is ACTIVE
    const lastStatus = logs[logs.length - 1];
    const isCurrentlyActive = lastStatus.status === AccountStatus.ACTIVE;

    for (let i = 0; i < logs.length; i++) {
      const currentLog = logs[i];

      if (currentLog.status === AccountStatus.ACTIVE) {
        // Start tracking active time
        activeStartTime = currentLog.timestamp;
      } else if (currentLog.status === AccountStatus.INACTIVE && activeStartTime) {
        // Calculate duration from ACTIVE to INACTIVE
        const duration = currentLog.timestamp.getTime() - activeStartTime.getTime();
        totalMilliseconds += duration;
        activeStartTime = null;
      }
    }

    // Edge case: If still active (last status is ACTIVE), add time from last ACTIVE to now
    if (isCurrentlyActive && activeStartTime) {
      const duration = now.getTime() - activeStartTime.getTime();
      totalMilliseconds += duration;
    }

    // Convert milliseconds to hours and minutes
    const totalMinutes = Math.floor(totalMilliseconds / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Format: "HH:MM" (zero-padded)
    const hoursStr = String(totalHours).padStart(2, '0');
    const minutesStr = String(remainingMinutes).padStart(2, '0');
    const formatted = `${hoursStr}:${minutesStr}`;

    return {
      totalHours,
      totalMinutes,
      formatted,
      isCurrentlyActive,
    };
  }

  /**
   * Calculate active hours for a specific date
   */
  async getActiveHoursForDate(
    driverId: string,
    date: string,
  ): Promise<{
    totalHours: number;
    totalMinutes: number;
    formatted: string;
    isCurrentlyActive: boolean;
  }> {
    const driverObjectId = new Types.ObjectId(driverId);
    const statusLog = await this.driverStatusLogModel.findOne({ driverId: driverObjectId, date }).exec();

    if (!statusLog || !statusLog.statusLogs || statusLog.statusLogs.length === 0) {
      return {
        totalHours: 0,
        totalMinutes: 0,
        formatted: '0h 0m',
        isCurrentlyActive: false,
      };
    }

    const logs = statusLog.statusLogs;
    let totalMilliseconds = 0;
    let activeStartTime: Date | null = null;
    const now = new Date();
    const isToday = date === this.getTodayDateString();

    // Check if last status is ACTIVE (only if it's today)
    const lastStatus = logs[logs.length - 1];
    const isCurrentlyActive = isToday && lastStatus.status === AccountStatus.ACTIVE;

    for (let i = 0; i < logs.length; i++) {
      const currentLog = logs[i];

      if (currentLog.status === AccountStatus.ACTIVE) {
        activeStartTime = currentLog.timestamp;
      } else if (currentLog.status === AccountStatus.INACTIVE && activeStartTime) {
        const duration = currentLog.timestamp.getTime() - activeStartTime.getTime();
        totalMilliseconds += duration;
        activeStartTime = null;
      }
    }

    // Edge case: If still active and it's today, add time from last ACTIVE to now
    if (isCurrentlyActive && activeStartTime) {
      const duration = now.getTime() - activeStartTime.getTime();
      totalMilliseconds += duration;
    }

    const totalMinutes = Math.floor(totalMilliseconds / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Format: "HH:MM" (zero-padded)
    const hoursStr = String(totalHours).padStart(2, '0');
    const minutesStr = String(remainingMinutes).padStart(2, '0');
    const formatted = `${hoursStr}:${minutesStr}`;

    return {
      totalHours,
      totalMinutes,
      formatted,
      isCurrentlyActive,
    };
  }
}
