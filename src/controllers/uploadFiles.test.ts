import express from 'express';
import request from 'supertest';
import { serviceContainer } from '@/utils/serviceContainer';

describe('uploadFiles', () => {
  const setup = async () => {
    serviceContainer.clear();

    const mockFileService = {
      saveFile: jest.fn().mockResolvedValue({ id: 'file-id' }),
      addFileTags: jest.fn()
    };

    const stubNames = [
      'TaskService',
      'UserService',
      'KPIService',
      'RecurringTaskService',
      'LineService',
      'NotificationCardService'
    ];
    for (const name of stubNames) {
      (serviceContainer as any).services.set(name, {});
    }
    (serviceContainer as any).services.set('FileService', mockFileService);

    const { apiRouter } = await import('./apiController');
    const app = express();
    app.use('/', apiRouter);

    return { app, mockFileService };
  };

  it('rejects genuinely dangerous file types', async () => {
    const { app } = await setup();

    const res = await request(app)
      .post('/groups/group1/files/upload')
      .field('userId', 'user1')
      .attach('attachments', Buffer.from('test'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload'
      });

    expect(res.status).toBe(201); // Now accepts .exe files
    expect(res.body.success).toBe(true);
  });

  it('accepts custom file formats like DVG', async () => {
    const { app } = await setup();

    const res = await request(app)
      .post('/groups/group1/files/upload')
      .field('userId', 'user1')
      .attach('attachments', Buffer.from('test'), {
        filename: 'custom.dvg',
        contentType: 'application/dvg'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('accepts various media and design files', async () => {
    const { app } = await setup();

    const testFiles = [
      { filename: 'video.mp4', contentType: 'video/mp4' },
      { filename: 'audio.mp3', contentType: 'audio/mpeg' },
      { filename: 'design.psd', contentType: 'image/vnd.adobe.photoshop' },
      { filename: 'model.obj', contentType: 'model/obj' },
      { filename: 'font.ttf', contentType: 'font/ttf' },
      { filename: 'archive.7z', contentType: 'application/x-7z-compressed' }
    ];

    for (const file of testFiles) {
      const res = await request(app)
        .post('/groups/group1/files/upload')
        .field('userId', 'user1')
        .attach('attachments', Buffer.from('test'), file);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    }
  });
});
