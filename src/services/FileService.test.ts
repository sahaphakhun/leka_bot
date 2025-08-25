const uploadMock = jest.fn().mockResolvedValue({
  public_id: 'publicid',
  secure_url: 'https://res.cloudinary.com/demo/raw/upload/v1/publicid.pdf',
  bytes: 123,
});

jest.mock('cloudinary', () => ({
  v2: {
    uploader: { upload: uploadMock },
    config: jest.fn(),
  },
}));

const getRepositoryMock = jest.fn();
jest.mock('@/utils/database', () => ({
  AppDataSource: { getRepository: getRepositoryMock },
}));

jest.mock('@/utils/serviceContainer', () => ({
  serviceContainer: { get: jest.fn().mockReturnValue({}) },
}));

describe('FileService.saveFile', () => {
  it('uses raw resource type for application files', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';

    const fileRepo = { create: jest.fn((d) => d), save: jest.fn(async (d) => d) } as any;
    const groupRepo = { findOne: jest.fn().mockResolvedValue({ id: 'group-uuid' }) } as any;
    const userRepo = { findOne: jest.fn().mockResolvedValue({ id: 'user-uuid' }) } as any;
    getRepositoryMock
      .mockImplementationOnce(() => fileRepo)
      .mockImplementationOnce(() => groupRepo)
      .mockImplementationOnce(() => userRepo);

    const { FileService } = require('./FileService');
    const service = new FileService();

    const buffer = Buffer.from('PDF content');
    const result = await service.saveFile({
      groupId: 'g1',
      uploadedBy: 'u1',
      messageId: 'm1',
      content: buffer,
      originalName: 'file.pdf',
      mimeType: 'application/pdf',
    });

    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringContaining('data:application/pdf;base64,'),
      expect.objectContaining({ resource_type: 'raw' })
    );
    expect(result.path).toContain('/raw/upload/');
  });
});
