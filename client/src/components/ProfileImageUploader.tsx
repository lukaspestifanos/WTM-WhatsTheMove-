import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileImageUploaderProps {
  currentImageUrl?: string;
  userName: string;
  onImageUpdate: (imageUrl: string) => void;
}

export function ProfileImageUploader({ currentImageUrl, userName, onImageUpdate }: ProfileImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please choose an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Get upload URL from backend
      const uploadResponse = await fetch('/api/upload/profile-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          filename: file.name,
          contentType: file.type,
          size: file.size 
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, imageUrl } = await uploadResponse.json();

      // Upload directly to cloud storage
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      // Update user profile with new image URL
      const updateResponse = await fetch('/api/user/profile-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageUrl }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      onImageUpdate(imageUrl);
      setIsDialogOpen(false);
      
      toast({
        title: "Success!",
        description: "Profile picture updated successfully",
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const initials = userName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer">
          <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
            <AvatarImage src={currentImageUrl} alt={userName} />
            <AvatarFallback className="text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Choose a new profile picture to personalize your account
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <Avatar className="w-32 h-32">
              <AvatarImage src={currentImageUrl} alt={userName} />
              <AvatarFallback className="text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="profile-image-upload"
            />
            <label htmlFor="profile-image-upload">
              <Button 
                asChild
                disabled={isUploading}
                className="w-full cursor-pointer"
                data-testid="button-upload-profile-image"
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Choose New Picture"}
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground text-center">
              Maximum file size: 5MB. Supports JPG, PNG, GIF
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}