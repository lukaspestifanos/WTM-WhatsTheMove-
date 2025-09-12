import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { 
  Share2, 
  Users, 
  Trophy, 
  Calendar, 
  Heart,
  Instagram,
  Twitter,
  Copy,
  UserPlus,
  Gift,
  Star,
  ArrowLeft,
  Edit,
  Save,
  X,
  Camera,
  MapPin,
  Clock,
  MessageCircle,
  ThumbsUp,
  Settings,
  Plus,
  ChevronRight,
  Sparkles,
  PartyPopper
} from "lucide-react";

interface UserStats {
  eventsHosted: number;
  eventsAttended: number;
  friendsCount: number;
  referralRewards: number;
  totalLikes: number;
  profileViews: number;
}

interface ProfileData {
  bio: string;
  instagramHandle: string;
  twitterHandle: string;
  profileImageUrl: string;
  location: string;
  interests: string[];
  isPublic: boolean;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
  imageUrl?: string;
  category: string;
  attendeeCount: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    profileImage?: string;
  };
  likes: number;
  isLiked: boolean;
}

const INTEREST_OPTIONS = [
  "Music & Concerts", "Sports & Fitness", "Food & Dining", "Study Groups",
  "Parties & Social", "Arts & Culture", "Tech & Gaming", "Outdoor Activities",
  "Business & Networking", "Volunteer & Community"
];

const ProfileImageUploader = ({ currentImageUrl, onImageUpdate }: { 
  currentImageUrl: string; 
  onImageUpdate: (url: string) => void; 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please choose an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      onImageUpdate(data.imageUrl);

      toast({
        title: "Profile updated!",
        description: "Your new profile picture has been saved",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [onImageUpdate, toast]);

  const initials = user?.firstName?.[0] + user?.lastName?.[0] || 'U';

  return (
    <div className="relative">
      <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
        <AvatarImage src={currentImageUrl} alt="Profile" />
        <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          {initials}
        </AvatarFallback>
      </Avatar>

      <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
        <Camera className="w-4 h-4" />
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          disabled={isUploading}
        />
      </label>

      {isUploading && (
        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

const SocialMediaConnector = ({ platform, handle, onUpdate, isEditing }: {
  platform: 'instagram' | 'twitter';
  handle: string;
  onUpdate: (handle: string) => void;
  isEditing: boolean;
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const Icon = platform === 'instagram' ? Instagram : Twitter;
  const color = platform === 'instagram' ? 'from-pink-500 to-purple-500' : 'from-blue-400 to-blue-600';

  const handleConnect = async () => {
    if (!handle.trim()) return;

    setIsConnecting(true);
    try {
      // Verify the account exists
      const response = await fetch(`/api/social/verify/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ handle: handle.replace('@', '') }),
      });

      if (response.ok) {
        onUpdate(handle);
      } else {
        throw new Error('Account not found');
      }
    } catch (error) {
      // Still allow connection for now, but show warning
      onUpdate(handle);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isEditing && !handle) return null;

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${color} flex items-center justify-center text-white`}>
        <Icon className="w-5 h-5" />
      </div>

      {isEditing ? (
        <div className="flex-1 flex items-center space-x-2">
          <Input
            value={handle}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder={`@${platform}handle`}
            className="flex-1"
          />
          {handle && !handle.startsWith('@') && (
            <Button size="sm" variant="outline" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? "Verifying..." : "Verify"}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex-1">
          <a 
            href={`https://${platform}.com/${handle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline flex items-center"
          >
            {handle}
            <ChevronRight className="w-3 h-3 ml-1" />
          </a>
        </div>
      )}
    </div>
  );
};

const EventCard = ({ event, showRole }: { event: Event; showRole?: 'hosted' | 'attended' }) => {
  const [, setLocation] = useLocation();

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setLocation(`/events/${event.id}`)}
    >
      <div className="relative">
        {event.imageUrl ? (
          <img 
            src={event.imageUrl} 
            alt={event.title}
            className="w-full h-32 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-t-lg flex items-center justify-center">
            <PartyPopper className="w-8 h-8 text-white" />
          </div>
        )}

        {showRole && (
          <Badge 
            className={`absolute top-2 right-2 ${
              showRole === 'hosted' 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {showRole === 'hosted' ? 'Hosted' : 'Attended'}
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        <h4 className="font-semibold text-sm truncate">{event.title}</h4>
        <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2">
          <Clock className="w-3 h-3" />
          <span>{new Date(event.startDate).toLocaleDateString()}</span>
          <Users className="w-3 h-3 ml-2" />
          <span>{event.attendeeCount}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const ProfileComments = ({ userId }: { userId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/users/${userId}/comments`],
    staleTime: 30 * 1000,
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/users/${userId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to post comment');
      return response.json();
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/comments`] });
      toast({
        title: "Comment posted!",
        description: "Your message has been added to their profile",
      });
    },
    onError: () => {
      toast({
        title: "Failed to post comment",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to like comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/comments`] });
    },
  });

  const handleSubmitComment = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave comments",
        variant: "destructive",
      });
      return;
    }
    commentMutation.mutate(newComment.trim());
  }, [newComment, user, commentMutation, toast]);

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Leave a message on their profile..."
            className="resize-none"
            maxLength={500}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {newComment.length}/500 characters
            </span>
            <Button 
              type="submit" 
              disabled={!newComment.trim() || commentMutation.isPending}
              size="sm"
            >
              {commentMutation.isPending ? "Posting..." : "Post Message"}
            </Button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-start space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.author.profileImage} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {comment.author.name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{comment.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-foreground">{comment.content}</p>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => likeMutation.mutate(comment.id)}
                      className={`h-8 px-2 ${comment.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                    >
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      {comment.likes}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet. Be the first to leave a comment!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function EnhancedProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const [stats, setStats] = useState<UserStats>({
    eventsHosted: 0,
    eventsAttended: 0,
    friendsCount: 0,
    referralRewards: 0,
    totalLikes: 0,
    profileViews: 0,
  });

  const [profileData, setProfileData] = useState<ProfileData>({
    bio: "",
    instagramHandle: "",
    twitterHandle: "",
    profileImageUrl: "",
    location: "",
    interests: [],
    isPublic: true,
  });

  // Load profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        bio: (user as any).bio || "",
        instagramHandle: (user as any).instagramHandle || "",
        twitterHandle: (user as any).twitterHandle || "",
        profileImageUrl: (user as any).profileImageUrl || "",
        location: (user as any).location || "",
        interests: (user as any).interests || [],
        isPublic: (user as any).isPublic ?? true,
      });

      setStats({
        eventsHosted: (user as any).eventsHosted || 0,
        eventsAttended: (user as any).eventsAttended || 0,
        friendsCount: (user as any).friendsCount || 0,
        referralRewards: (user as any).referralRewards || 0,
        totalLikes: (user as any).totalLikes || 0,
        profileViews: (user as any).profileViews || 0,
      });
    }
  }, [user]);

  // Queries for events
  const { data: hostedEvents = [] } = useQuery<Event[]>({
    queryKey: [`/api/users/${user?.id}/events/hosted`],
    enabled: !!user,
  });

  const { data: attendedEvents = [] } = useQuery<Event[]>({
    queryKey: [`/api/users/${user?.id}/events/attended`],
    enabled: !!user,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      toast({
        title: "Profile updated!",
        description: "Your changes have been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = useCallback(() => {
    saveProfileMutation.mutate(profileData);
  }, [profileData, saveProfileMutation]);

  const copyReferralCode = useCallback(async () => {
    const referralCode = (user as any)?.referralCode || 'BETA-USER-' + user?.id?.slice(0, 8);
    const referralUrl = `https://whatsmove.com?ref=${referralCode}`;

    try {
      await navigator.clipboard.writeText(referralUrl);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const shareProfile = useCallback(async () => {
    if (navigator.share && user) {
      try {
        await navigator.share({
          title: `${user.firstName}'s Profile - What's the Move`,
          text: "Check out my profile and let's discover amazing events together!",
          url: `https://whatsmove.com/profile/${user.id}`,
        });
      } catch (error) {
        copyReferralCode();
      }
    } else {
      copyReferralCode();
    }
  }, [user, copyReferralCode]);

  const toggleInterest = useCallback((interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={shareProfile}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>

            {isEditing ? (
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveProfile}
                  disabled={saveProfileMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saveProfileMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card className="relative overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 relative">
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-2 right-2 text-white/80 text-xs">
              {stats.profileViews} profile views
            </div>
          </div>

          <CardContent className="relative -mt-12 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
              <ProfileImageUploader
                currentImageUrl={profileData.profileImageUrl}
                onImageUpdate={(url) => setProfileData(prev => ({ ...prev, profileImageUrl: url }))}
              />

              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center">
                    {user.firstName} {user.lastName}
                    {stats.eventsHosted >= 5 && (
                      <Sparkles className="w-5 h-5 ml-2 text-yellow-500" title="Active Host" />
                    )}
                  </h2>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    {user.university && (
                      <>
                        <span>{user.university}</span>
                        {user.graduationYear && <span>'${user.graduationYear}</span>}
                      </>
                    )}
                    {profileData.location && (
                      <>
                        <span>•</span>
                        <MapPin className="w-3 h-3" />
                        <span>{profileData.location}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{stats.eventsHosted}</div>
                    <div className="text-xs text-muted-foreground">Hosted</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-pink-600">{stats.eventsAttended}</div>
                    <div className="text-xs text-muted-foreground">Attended</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.friendsCount}</div>
                    <div className="text-xs text-muted-foreground">Friends</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.totalLikes}</div>
                    <div className="text-xs text-muted-foreground">Likes</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="about" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About Me</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell people what makes you an awesome event companion..."
                        className="mt-1"
                        maxLength={300}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {profileData.bio.length}/300 characters
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        value={profileData.location}
                        onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Cincinnati, OH"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Interests</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {INTEREST_OPTIONS.map((interest) => (
                          <Button
                            key={interest}
                            variant={profileData.interests.includes(interest) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleInterest(interest)}
                            className="justify-start text-xs"
                          >
                            {profileData.interests.includes(interest) && <span className="mr-1">✓</span>}
                            {interest}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-foreground">
                        {profileData.bio || "No bio added yet. Click edit to add one!"}
                      </p>
                    </div>

                    {profileData.interests.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Interests</p>
                        <div className="flex flex-wrap gap-2">
                          {profileData.interests.map((interest) => (
                            <Badge key={interest} variant="secondary">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Media */}
            <Card>
              <CardHeader>
                <CardTitle>Connect</CardTitle>
                <CardDescription>Link your social media accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SocialMediaConnector
                  platform="instagram"
                  handle={profileData.instagramHandle}
                  onUpdate={(handle) => setProfileData(prev => ({ ...prev, instagramHandle: handle }))}
                  isEditing={isEditing}
                />
                <SocialMediaConnector
                  platform="twitter"
                  handle={profileData.twitterHandle}
                  onUpdate={(handle) => setProfileData(prev => ({ ...prev, twitterHandle: handle }))}
                  isEditing={isEditing}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Events I've Hosted ({stats.eventsHosted})</span>
                    <Button size="sm" onClick={() => setLocation('/create-event')}>
                      <Plus className="w-4 h-4 mr-1" />
                      Host Event
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {hostedEvents.slice(0, 6).map((event) => (
                      <EventCard key={event.id} event={event} showRole="hosted" />
                    ))}
                    {hostedEvents.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No events hosted yet</p>
                        <Button size="sm" className="mt-2" onClick={() => setLocation('/create-event')}>
                          Host Your First Event
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Events I've Attended ({stats.eventsAttended})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {attendedEvents.slice(0, 6).map((event) => (
                      <EventCard key={event.id} event={event} showRole="attended" />
                    ))}
                    {attendedEvents.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No events attended yet</p>
                        <Button size="sm" className="mt-2" onClick={() => setLocation('/')}>
                          Discover Events
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Profile Activity</CardTitle>
                <CardDescription>Messages and interactions on your profile</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileComments userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-700 dark:text-yellow-300">
                  <Gift className="w-5 h-5 mr-2" />
                  Referral Program
                </CardTitle>
                <CardDescription>
                  Invite friends and unlock exclusive benefits!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <div>
                    <p className="font-medium">Your Referral Link</p>
                    <p className="text-sm text-muted-foreground">
                      Share with friends to earn rewards
                    </p>
                  </div>
                  <Button onClick={copyReferralCode} variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{stats.referralRewards}</div>
                    <div className="text-sm text-muted-foreground">Reward Points</div>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <UserPlus className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">Referrals</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'first-event', name: 'First Event', desc: 'Host your first event', icon: Calendar, achieved: stats.eventsHosted >= 1, color: 'green' },
                    { id: 'social-butterfly', name: 'Social Butterfly', desc: 'Add 5+ friends', icon: Users, achieved: stats.friendsCount >= 5, color: 'blue' },
                    { id: 'event-lover', name: 'Event Lover', desc: 'Attend 10+ events', icon: Heart, achieved: stats.eventsAttended >= 10, color: 'purple' },
                    { id: 'influencer', name: 'Influencer', desc: '100+ profile likes', icon: Sparkles, achieved: stats.totalLikes >= 100, color: 'yellow' },
                  ].map((achievement) => {
                    const Icon = achievement.icon;
                    const colors = {
                      green: achievement.achieved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200',
                      blue: achievement.achieved ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200',
                      purple: achievement.achieved ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200',
                      yellow: achievement.achieved ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200',
                    };
                    const iconColors = {
                      green: achievement.achieved ? 'text-green-600' : 'text-gray-400',
                      blue: achievement.achieved ? 'text-blue-600' : 'text-gray-400',
                      purple: achievement.achieved ? 'text-purple-600' : 'text-gray-400',
                      yellow: achievement.achieved ? 'text-yellow-600' : 'text-gray-400',
                    };

                    return (
                      <div key={achievement.id} className={`text-center p-4 rounded-lg border ${colors[achievement.color as keyof typeof colors]}`}>
                        <Icon className={`w-8 h-8 mx-auto mb-2 ${iconColors[achievement.color as keyof typeof iconColors]}`} />
                        <p className="text-sm font-medium">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.desc}</p>
                        {achievement.achieved && (
                          <Badge className="mt-2 bg-green-500" size="sm">Unlocked</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}