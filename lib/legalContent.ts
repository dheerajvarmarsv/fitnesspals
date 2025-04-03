import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export async function loadLegalContent(filename: string): Promise<string> {
  try {
    const asset = Asset.fromModule(
      filename === 'privacy-policy' 
        ? require('../assets/legal/privacy-policy.html')
        : require('../assets/legal/terms-of-service.html')
    );
    
    await asset.downloadAsync();
    
    if (asset.localUri) {
      const content = await FileSystem.readAsStringAsync(asset.localUri);
      return content;
    }
    
    throw new Error('Failed to load legal content');
  } catch (error) {
    console.error('Error loading legal content:', error);
    return 'Failed to load content. Please try again later.';
  }
} 