import { NextApiRequest, NextApiResponse } from 'next'
import cloudinary from '@/lib/cloudinary'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { file } = req.body

    if (!file) {
      return res.status(400).json({ message: 'No file provided' })
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file, {
      folder: 'autoparts',
      resource_type: 'auto',
    })

    res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ message: 'Upload failed' })
  }
}
