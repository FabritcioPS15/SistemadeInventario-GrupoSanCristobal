import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Request,
  Query,
  Response,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Express } from 'express';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Body() body: {
      assetId?: string;
      ticketId?: string;
      maintenanceId?: string;
      locationId?: string;
      description?: string;
      tags?: string;
      isPublic?: string;
    },
  ) {
    try {
      const options = {
        assetId: body.assetId,
        ticketId: body.ticketId,
        maintenanceId: body.maintenanceId,
        locationId: body.locationId,
        description: body.description,
        tags: body.tags ? body.tags.split(',').map(tag => tag.trim()) : [],
        isPublic: body.isPublic === 'true',
      };

      const uploadedFile = await this.filesService.uploadFile(
        file,
        req.user.id,
        options,
      );

      return {
        message: 'Archivo subido exitosamente',
        file: uploadedFile,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Máximo 10 archivos
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
    @Body() body: {
      assetId?: string;
      ticketId?: string;
      maintenanceId?: string;
      locationId?: string;
      description?: string;
      tags?: string;
      isPublic?: string;
    },
  ) {
    try {
      const options = {
        assetId: body.assetId,
        ticketId: body.ticketId,
        maintenanceId: body.maintenanceId,
        locationId: body.locationId,
        description: body.description,
        tags: body.tags ? body.tags.split(',').map(tag => tag.trim()) : [],
        isPublic: body.isPublic === 'true',
      };

      const uploadedFiles = await this.filesService.uploadMultipleFiles(
        files,
        req.user.id,
        options,
      );

      return {
        message: `${uploadedFiles.length} archivos subidos exitosamente`,
        files: uploadedFiles,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  async getFile(@Param('id') id: string, @Request() req) {
    return this.filesService.getFile(id, req.user.id);
  }

  @Get(':id/download')
  async downloadFile(@Param('id') id: string, @Request() req, @Response() res) {
    try {
      const { buffer, filename, mimeType } = await this.filesService.downloadFile(
        id,
        req.user.id,
      );

      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.end(buffer);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Request() req) {
    return this.filesService.deleteFile(id, req.user.id);
  }

  @Put(':id')
  async updateFile(
    @Param('id') id: string,
    @Request() req,
    @Body() body: {
      description?: string;
      tags?: string;
      isPublic?: string;
    },
  ) {
    try {
      const updates = {
        description: body.description,
        tags: body.tags ? body.tags.split(',').map(tag => tag.trim()) : undefined,
        isPublic: body.isPublic !== undefined ? body.isPublic === 'true' : undefined,
      };

      return this.filesService.updateFile(id, req.user.id, updates);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('entity/:entityType/:entityId')
  async getFilesByEntity(
    @Param('entityType') entityType: 'asset' | 'ticket' | 'maintenance' | 'location',
    @Param('entityId') entityId: string,
    @Request() req,
  ) {
    return this.filesService.getFilesByEntity(entityType, entityId, req.user.id);
  }

  @Get('search')
  async searchFiles(@Query('q') query: string, @Request() req) {
    if (!query) {
      throw new BadRequestException('El parámetro de búsqueda "q" es requerido');
    }

    return this.filesService.searchFiles(query, req.user.id);
  }

  @Get('stats/my')
  async getMyFileStats(@Request() req) {
    return this.filesService.getFileStats(req.user.id);
  }

  @Get('stats/all')
  async getAllFileStats(@Request() req) {
    // Solo administradores pueden ver estadísticas globales
    const user = req.user;
    if (!['super_admin', 'sistemas', 'gerencia'].includes(user.role)) {
      throw new BadRequestException('No tienes permiso para ver estadísticas globales');
    }

    return this.filesService.getFileStats();
  }
}
