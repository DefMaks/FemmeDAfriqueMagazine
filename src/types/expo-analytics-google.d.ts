declare module 'expo-analytics-google' {
  class Analytics {
    constructor(trackingId: string);
    hit(type: string, params?: any): Promise<void>;
  }
  
  export default Analytics;
}
