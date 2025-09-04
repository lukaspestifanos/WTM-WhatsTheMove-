import express from 'express';
import { storage } from '../storage';
import { authMiddleware } from '../middleware/auth';
import { ObjectStorageService } from '../objectStorage';
import { z } from 'zod';

const router = express.Router();

// Update profile information
router.put('/profile', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.userId;
    const profileData = req.body;

    // For now, just return success since bio and social fields aren't in database yet
    // TODO: Update when database schema is updated
    
    res.json({ 
      success: true, 
      message: "Profile will be updated once database migration is complete" 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile image
router.post('/upload/profile-image', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.userId;
    const { filename, contentType, size } = req.body;

    // Validate file
    if (!filename || !contentType || !size) {
      return res.status(400).json({ error: 'Missing file information' });
    }

    if (size > 5 * 1024 * 1024) { // 5MB limit
      return res.status(400).json({ error: 'File too large' });
    }

    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files allowed' });
    }

    const objectStorageService = new ObjectStorageService();
    const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
    
    // Generate the final image URL (this would be the path after upload)
    const imageUrl = `/objects/${uploadUrl.split('/uploads/')[1]}`;

    res.json({ 
      uploadUrl,
      imageUrl
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Update profile image URL after successful upload
router.post('/profile-image', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.userId;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL required' });
    }

    // For now, just return success since profileImageUrl field isn't in database yet
    // TODO: Update user profile when database schema is updated
    
    res.json({ 
      success: true, 
      message: "Profile image will be updated once database migration is complete",
      imageUrl 
    });
  } catch (error) {
    console.error('Profile image update error:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

export default router;