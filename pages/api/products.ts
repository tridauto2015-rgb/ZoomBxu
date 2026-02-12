import { NextApiRequest, NextApiResponse } from 'next'
import connectDB from '@/lib/mongodb'
import Product from '@/lib/models/product'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB()

    if (req.method === 'GET') {
      const products = await Product.find({}).sort({ createdAt: -1 })
      res.status(200).json(products)
    }
    
    else if (req.method === 'POST') {
      const product = await Product.create(req.body)
      res.status(201).json(product)
    }
    
    else if (req.method === 'PUT') {
      const { id } = req.query
      if (!id || typeof id !== 'string') {
        res.status(400).json({ message: 'Valid ID required' })
        return
      }
      const product = await Product.findByIdAndUpdate(id, req.body, { new: true })
      if (!product) {
        res.status(404).json({ message: 'Product not found' })
        return
      }
      res.status(200).json(product)
    }
    
    else if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id || typeof id !== 'string') {
        res.status(400).json({ message: 'Valid ID required' })
        return
      }
      const product = await Product.findByIdAndDelete(id)
      if (!product) {
        res.status(404).json({ message: 'Product not found' })
        return
      }
      res.status(200).json({ message: 'Product deleted successfully' })
    }
    
    else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
