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

  it('rejects disallowed file types', async () => {
    const { app } = await setup();

    const res = await request(app)
      .post('/groups/group1/files/upload')
      .field('userId', 'user1')
      .attach('attachments', Buffer.from('test'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Invalid file type/);
  });

  it('accepts supported office documents', async () => {
    const { app } = await setup();

    const res = await request(app)
      .post('/groups/group1/files/upload')
      .field('userId', 'user1')
      .attach('attachments', Buffer.from('test'), {
        filename: 'doc.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
