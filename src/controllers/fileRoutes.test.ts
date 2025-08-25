import express from 'express';
import request from 'supertest';

jest.setTimeout(15000);

describe('File routes', () => {
  const setup = async (fileInfo: any) => {
    jest.resetModules();
    const { serviceContainer } = await import('@/utils/serviceContainer');
    serviceContainer.clear();

    const mockFileService = {
      isFileInGroup: jest.fn().mockResolvedValue(true),
      getFileInfo: jest.fn().mockResolvedValue(fileInfo),
      getFileContent: jest.fn(),
      resolveFileUrl: jest.fn((f) => f.path),
      getFileExtension: jest.fn()
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

    const { apiRouter } = await import('@/controllers/apiController');
    const app = express();
    app.use('/', apiRouter);

    return { app, mockFileService };
  };

  it('redirects downloadFile to remote URL', async () => {
    const url = 'https://example.com/test-image.jpg';
    const { app, mockFileService } = await setup({
      id: '1',
      path: url,
      mimeType: 'image/jpeg',
      originalName: 'test-image.jpg'
    });

    const res = await request(app).get('/files/1/download').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(url);
    expect(mockFileService.getFileContent).not.toHaveBeenCalled();
  });

  it('redirects previewFile to remote URL', async () => {
    const url = 'https://example.com/test.pdf';
    const { app, mockFileService } = await setup({
      id: '2',
      path: url,
      mimeType: 'application/pdf',
      originalName: 'test.pdf'
    });

    const res = await request(app).get('/files/2/preview').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(url);
    expect(mockFileService.getFileContent).not.toHaveBeenCalled();
  });

  it('adds file extension when missing based on mime type', async () => {
    const { app, mockFileService } = await setup({
      id: '3',
      path: '/local/path',
      mimeType: 'application/pdf',
      originalName: 'document'
    });

    const buffer = Buffer.from('test');
    mockFileService.getFileContent.mockResolvedValue({
      content: buffer,
      mimeType: 'application/pdf',
      originalName: 'document'
    });
    mockFileService.getFileExtension.mockReturnValue('.pdf');

    const res = await request(app).get('/files/3/download');

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('filename="document.pdf"');
    expect(mockFileService.getFileExtension).toHaveBeenCalledWith('application/pdf', 'document');
  });
});
