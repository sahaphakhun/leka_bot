// Mock dependencies that require external services or databases
jest.mock('./TaskService', () => ({ TaskService: jest.fn(() => ({})) }));
jest.mock('./NotificationService', () => ({ NotificationService: jest.fn(() => ({})) }));
jest.mock('./KPIService', () => ({ KPIService: jest.fn(() => ({})) }));

const scheduleMock = jest.fn(() => ({ start: jest.fn(), stop: jest.fn() }));

jest.mock('node-cron', () => ({
  schedule: scheduleMock,
}));

import { CronService } from './CronService';

describe('CronService.start', () => {
  beforeEach(() => {
    scheduleMock.mockClear();
  });

  it('avoids creating duplicate jobs when called twice', () => {
    const service = new CronService();
    const stopSpy = jest.spyOn(service, 'stop');

    service.start();
    const jobCount = (service as any).jobs.size;
    expect(scheduleMock).toHaveBeenCalledTimes(jobCount);

    service.start();

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledTimes(jobCount * 2);
    expect((service as any).jobs.size).toBe(jobCount);
  });
});

