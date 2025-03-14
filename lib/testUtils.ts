// lib/testUtils.ts
class DateMocker {
    private originalDate: DateConstructor;
    private mockedDate: Date | null = null;
  
    constructor() {
      this.originalDate = global.Date;
    }
  
    // Set a specific date for testing
    mockDate(date: Date | string | number) {
      this.mockedDate = new Date(date);
      
      // @ts-ignore - Override the Date constructor
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            // When new Date() is called with no args, return the mocked date
            return new Date(mockInstance.mockedDate!.getTime());
          }
          // @ts-ignore
          return new Date(...args);
        }
        
        // Also mock Date.now()
        static now() {
          return mockInstance.mockedDate!.getTime();
        }
      };
    }
  
    // Restore the original Date
    restore() {
      global.Date = this.originalDate;
      this.mockedDate = null;
    }
  }
  
  const mockInstance = new DateMocker();
  export const mockDate = mockInstance.mockDate.bind(mockInstance);
  export const restoreDate = mockInstance.restore.bind(mockInstance);