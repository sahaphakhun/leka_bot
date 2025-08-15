import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../utils/config';

const router = Router();

// GET /api/images/:filename - ดึงรูปภาพ
router.get('/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // ตรวจสอบ filename เพื่อป้องกัน path traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ 
        error: 'Invalid filename',
        message: 'Filename contains invalid characters' 
      });
    }

    const imagePath = path.join(config.uploadPath, filename);
    
    // ตรวจสอบว่าไฟล์มีอยู่จริง
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ 
        error: 'Image not found',
        message: `Image ${filename} does not exist` 
      });
    }

    // ตรวจสอบว่าเป็นไฟล์รูปภาพ
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        message: 'Only image files are allowed' 
      });
    }

    // ส่งไฟล์รูปภาพ
    res.sendFile(imagePath);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to serve image' 
    });
  }
});

// GET /api/images - รายการรูปภาพทั้งหมด
router.get('/', (req: Request, res: Response) => {
  try {
    const uploadPath = config.uploadPath;
    
    if (!fs.existsSync(uploadPath)) {
      return res.json({ images: [] });
    }

    const files = fs.readdirSync(uploadPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    const images = imageFiles.map(filename => ({
      filename,
      url: `/api/images/${filename}`,
      size: fs.statSync(path.join(uploadPath, filename)).size,
      uploadedAt: fs.statSync(path.join(uploadPath, filename)).mtime
    }));

    res.json({ images });
    
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to list images' 
    });
  }
});

export { router as imageRouter };
