import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CamerasService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.camera.findMany({
      include: {
        location: true,
        camera_disks: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.camera.findUnique({
      where: { id },
      include: {
        location: true,
        camera_disks: true,
      },
    });
  }

  async create(data: any) {
    const { camera_disks, ...cameraData } = data;
    return this.prisma.camera.create({
      data: {
        ...cameraData,
        camera_disks: camera_disks ? {
          create: camera_disks
        } : undefined
      },
      include: {
        location: true,
        camera_disks: true,
      }
    });
  }

  async update(id: string, data: any) {
    const { camera_disks, ...cameraData } = data;
    
    // Si hay discos, primero eliminamos los existentes y luego creamos los nuevos
    if (camera_disks) {
      await this.prisma.cameraDisk.deleteMany({ where: { camera_id: id } });
    }

    return this.prisma.camera.update({
      where: { id },
      data: {
        ...cameraData,
        camera_disks: camera_disks ? {
          create: camera_disks
        } : undefined
      },
      include: {
        location: true,
        camera_disks: true,
      }
    });
  }

  async remove(id: string) {
    // Cascade delete is handled by prisma if configured, otherwise manual
    await this.prisma.cameraDisk.deleteMany({ where: { camera_id: id } });
    return this.prisma.camera.delete({
      where: { id },
    });
  }

  // Stored Disks
  async findStoredDisks() {
    return this.prisma.storedDisk.findMany({
      include: {
        camera: {
          include: {
            location: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async createStoredDisk(data: any) {
    return this.prisma.storedDisk.create({
      data
    });
  }

  async updateStoredDisk(id: string, data: any) {
    return this.prisma.storedDisk.update({
      where: { id },
      data
    });
  }

  async removeStoredDisk(id: string) {
    return this.prisma.storedDisk.delete({
      where: { id }
    });
  }
}
