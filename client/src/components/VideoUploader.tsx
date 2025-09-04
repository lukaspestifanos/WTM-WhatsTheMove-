import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VideoUploaderProps {
  eventId?: string;
  commentId?: string;
  isGuest?: boolean;
  guestName?: string;
  guestEmail?: string;
  onUploadComplete?: () => void;
}

export function VideoUploader({
  eventId,
  commentId,
  isGuest = false,
  guestName = "",
  guestEmail = "",
  onUploadComplete,
}: VideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    name: guestName,
    email: guestEmail,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, uploadURL }: { file: File; uploadURL: string }) => {
      const response = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      
      return uploadURL;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = isGuest ? "/api/media/guest" : "/api/media";
      return await apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Video Uploaded",
        description: "Your video has been uploaded successfully!",
      });
      setShowUploader(false);
      setSelectedFile(null);
      onUploadComplete?.();
      // Invalidate relevant queries
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "media"] });
      }
      if (commentId) {
        queryClient.invalidateQueries({ queryKey: ["/api/comments", commentId, "media"] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save video information",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's a video file
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Invalid File",
          description: "Please select a video file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a video file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    if (isGuest && (!guestInfo.name || !guestInfo.email)) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get upload URL
      const uploadResponse = await apiRequest("POST", "/api/objects/upload", {});
      const { uploadURL } = uploadResponse;

      // Upload file
      await uploadMutation.mutateAsync({
        file: selectedFile,
        uploadURL,
      });

      // Save media record
      const mediaData = {
        eventId,
        commentId,
        type: "video",
        url: uploadURL,
        filename: selectedFile.name,
        fileSize: selectedFile.size,
        ...(isGuest && {
          guestName: guestInfo.name,
          guestEmail: guestInfo.email,
        }),
      };

      await saveMutation.mutateAsync(mediaData);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!showUploader) {
    return (
      <Button
        variant="outline"
        onClick={() => setShowUploader(true)}
        className="flex items-center gap-2"
        data-testid="button-upload-video"
      >
        <i className="fas fa-video"></i>
        Upload Video
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Video</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGuest && (
          <>
            <div>
              <Label htmlFor="uploader-name">Name *</Label>
              <Input
                id="uploader-name"
                type="text"
                value={guestInfo.name}
                onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                placeholder="Your name"
                required
                data-testid="input-uploader-name"
              />
            </div>
            <div>
              <Label htmlFor="uploader-email">Email *</Label>
              <Input
                id="uploader-email"
                type="email"
                value={guestInfo.email}
                onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                placeholder="your.email@example.com"
                required
                data-testid="input-uploader-email"
              />
            </div>
          </>
        )}
        
        <div>
          <Label htmlFor="video-file">Select Video File</Label>
          <Input
            id="video-file"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            data-testid="input-video-file"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Maximum file size: 50MB. Supported formats: MP4, MOV, AVI, etc.
          </p>
        </div>

        {selectedFile && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Selected file:</p>
            <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || uploadMutation.isPending || saveMutation.isPending}
            className="flex-1"
            data-testid="button-confirm-upload"
          >
            {isUploading || uploadMutation.isPending || saveMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading...
              </>
            ) : (
              "Upload Video"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowUploader(false);
              setSelectedFile(null);
            }}
            data-testid="button-cancel-upload"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}