import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary credentials not configured' },
        { status: 500 }
      );
    }

    // Generate timestamp
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Create signature
    const crypto = require('crypto');
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');

    // Make delete request to Cloudinary
    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const data = await response.json();

    if (data.result === 'ok') {
      return NextResponse.json({ success: true, message: 'Image deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete image', details: data },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
