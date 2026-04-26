// Cloudinary configuration and upload functions
import { logger } from './logger';

const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export const uploadToCloudinary = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'team-logos'); // Organize uploads in folders

    logger.log('Uploading to Cloudinary with preset:', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('Cloudinary error response:', errorData);
      throw new Error(`Upload failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    logger.log('Upload successful:', data);
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw error;
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete image');
    }

    logger.log('Image deleted successfully:', publicId);
    return data;
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw error;
  }
};

// Generate optimized image URLs
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = 200,
    height = 200,
    crop = 'fill',
    quality = 'auto',
    format = 'auto'
  } = options;

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/${publicId}`;
};
