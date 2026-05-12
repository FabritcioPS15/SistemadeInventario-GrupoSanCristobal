import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { join } from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class FilesService {
  private readonly uploadDir = './uploads';
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedMimeTypes = [
    // Imágenes
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Archivos comprimidos
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Otros
    'application/json',
  ];

  constructor(private prisma: PrismaService) {
    this.ensureUploadDirectories();
  }

  // Type assertion helper to bypass TypeScript issues with Prisma file model
  private get db() {
    return (this.prisma as any);
  }

  private async ensureUploadDirectories() {
    const directories = [
      join(this.uploadDir, 'assets'),
      join(this.uploadDir, 'tickets'),
      join(this.uploadDir, 'maintenance'),
      join(this.uploadDir, 'locations'),
      join(this.uploadDir, 'users'),
      join(this.uploadDir, 'temp'),
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${random}.${extension}`;
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  private getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('sheet') || mimeType.includes('presentation')) {
      return 'documents';
    }
    return 'other';
  }

  async uploadFile(
    file: Express.Multer.File,
    uploadedBy: string,
    options: {
      assetId?: string;
      ticketId?: string;
      maintenanceId?: string;
      locationId?: string;
      description?: string;
      tags?: string[];
      isPublic?: boolean;
    } = {}
  ) {
    // Validar archivo
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`El archivo excede el tamaño máximo de ${this.maxFileSize / 1024 / 1024}MB`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido');
    }

    try {
      // Generar nombre único
      const uniqueFilename = this.generateUniqueFilename(file.originalname);
      const category = this.getFileCategory(file.mimetype);
      const filePath = join(this.uploadDir, category, uniqueFilename);

      // Guardar archivo
      await fs.writeFile(filePath, file.buffer);

      // Calcular hash
      const fileHash = await this.calculateFileHash(filePath);

      // Guardar en base de datos
      const savedFile = await this.db.file.create({
        data: {
          original_name: file.originalname,
          filename: uniqueFilename,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.mimetype,
          file_hash: fileHash,
          uploaded_by: uploadedBy,
          asset_id: options.assetId,
          ticket_id: options.ticketId,
          maintenance_id: options.maintenanceId,
          location_id: options.locationId,
          description: options.description,
          tags: options.tags || [],
          is_public: options.isPublic || false,
        },
        include: {
          uploader: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      });

      return savedFile;
    } catch (error) {
      throw new BadRequestException(`Error al subir el archivo: ${error.message}`);
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    uploadedBy: string,
    options: {
      assetId?: string;
      ticketId?: string;
      maintenanceId?: string;
      locationId?: string;
      description?: string;
      tags?: string[];
      isPublic?: boolean;
    } = {}
  ) {
    const uploadedFiles = [];

    for (const file of files) {
      try {
        const uploadedFile = await this.uploadFile(file, uploadedBy, options);
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        console.error(`Error al subir archivo ${file.originalname}:`, error.message);
      }
    }

    return uploadedFiles;
  }

  async getFile(fileId: string, userId?: string) {
    const file = await this.db.file.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Verificar permisos (solo el uploader o usuarios autorizados pueden acceder)
    if (!file.is_public && file.uploaded_by !== userId) {
      throw new NotFoundException('No tienes permiso para acceder a este archivo');
    }

    return file;
  }

  async downloadFile(fileId: string, userId?: string) {
    const file = await this.getFile(fileId, userId);

    try {
      const fileBuffer = await fs.readFile(file.file_path);
      
      // Incrementar contador de descargas
      await this.db.file.update({
        where: { id: fileId },
        data: { download_count: { increment: 1 } },
      });

      return {
        buffer: fileBuffer,
        filename: file.original_name,
        mimeType: file.mime_type,
      };
    } catch (error) {
      throw new NotFoundException('Archivo no encontrado en el sistema de archivos');
    }
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await (this.prisma as any).file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Solo el uploader puede eliminar (o administradores)
    if (file.uploaded_by !== userId) {
      throw new BadRequestException('No tienes permiso para eliminar este archivo');
    }

    try {
      // Eliminar archivo del sistema
      await fs.unlink(file.file_path);

      // Eliminar registro de la base de datos
      await this.db.file.delete({
        where: { id: fileId },
      });

      return { message: 'Archivo eliminado correctamente' };
    } catch (error) {
      throw new BadRequestException(`Error al eliminar el archivo: ${error.message}`);
    }
  }

  async getFilesByEntity(
    entityType: 'asset' | 'ticket' | 'maintenance' | 'location',
    entityId: string,
    userId?: string
  ) {
    const whereClause: any = {};

    switch (entityType) {
      case 'asset':
        whereClause.asset_id = entityId;
        break;
      case 'ticket':
        whereClause.ticket_id = entityId;
        break;
      case 'maintenance':
        whereClause.maintenance_id = entityId;
        break;
      case 'location':
        whereClause.location_id = entityId;
        break;
    }

    // Si no es uploader, solo mostrar archivos públicos
    if (userId) {
      whereClause.OR = [
        { is_public: true },
        { uploaded_by: userId },
      ];
    } else {
      whereClause.is_public = true;
    }

    return this.db.file.findMany({
      where: whereClause,
      include: {
        uploader: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async searchFiles(query: string, userId?: string) {
    const whereClause: any = {
      OR: [
        { original_name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
      ],
    };

    if (userId) {
      whereClause.OR = [
        ...whereClause.OR,
        { is_public: true },
        { uploaded_by: userId },
      ];
    } else {
      whereClause.is_public = true;
    }

    return this.db.file.findMany({
      where: whereClause,
      include: {
        uploader: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getFileStats(userId?: string) {
    const whereClause = userId ? { uploaded_by: userId } : {};

    const stats = await this.db.file.groupBy({
      by: ['mime_type'],
      where: whereClause,
      _count: { id: true },
      _sum: { file_size: true },
    });

    const totalFiles = await this.db.file.count({ where: whereClause });
    const totalSize = await this.db.file.aggregate({
      where: whereClause,
      _sum: { file_size: true },
    });

    return {
      totalFiles,
      totalSize: totalSize._sum.file_size || 0,
      byType: stats.map(stat => ({
        mimeType: stat.mime_type,
        count: stat._count.id,
        size: stat._sum.file_size || 0,
      })),
    };
  }

  async updateFile(fileId: string, userId: string, updates: {
    description?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    const file = await this.db.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (file.uploaded_by !== userId) {
      throw new BadRequestException('No tienes permiso para modificar este archivo');
    }

    return this.db.file.update({
      where: { id: fileId },
      data: updates,
    });
  }

  async cleanupExpiredFiles() {
    const expiredFiles = await this.db.file.findMany({
      where: {
        expires_at: {
          lte: new Date(),
        },
      },
    });

    for (const file of expiredFiles) {
      try {
        await fs.unlink(file.file_path);
        await this.db.file.delete({
          where: { id: file.id },
        });
      } catch (error) {
        console.error(`Error al eliminar archivo expirado ${file.id}:`, error.message);
      }
    }

    return { deleted: expiredFiles.length };
  }
}
