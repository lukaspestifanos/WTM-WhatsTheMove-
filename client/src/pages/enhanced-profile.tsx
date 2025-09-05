import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { ProfileImageUploader } from "@/components/ProfileImageUploader";
import { NotificationSettings } from "@/components/NotificationSettings";
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
  X
} from "lucide-react";

interface UserStats {
  eventsHosted: number;
  eventsAttended: number;
  friendsCount: number;
  referralRewards: number;
}

export default function EnhancedProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    eventsHosted: 0,
    eventsAttended: 0,
    friendsCount: 0,
    referralRewards: 0,
  });
  const [profileData, setProfileData] = useState({
    bio: "",
    instagramHandle: "",
    twitterHandle: "",
    profileImageUrl: "",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        bio: (user as any).bio || "",
        instagramHandle: (user as any).instagramHandle || "",
        twitterHandle: (user as any).twitterHandle || "",
        profileImageUrl: (user as any).profileImageUrl || "",
      });
      
      setStats({
        eventsHosted: (user as any).eventsHosted || 0,
        eventsAttended: (user as any).eventsAttended || 0,
        friendsCount: (user as any).friendsCount || 0,
        referralRewards: (user as any).referralRewards || 0,
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setIsEditing(false);
      toast({
        title: "Profile Updated!",
        description: "Your changes have been saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const copyReferralCode = async () => {
    const referralCode = (user as any)?.referralCode;
    if (!referralCode) {
      toast({
        title: "Referral System Coming Soon!",
        description: "Your referral code will be available once database migration completes",
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(`https://app.whatsmove.com/?ref=${referralCode}`);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  const shareProfile = async () => {
    if (navigator.share && user) {
      try {
        await navigator.share({
          title: `Check out ${user.firstName}'s profile on What's the Move!`,
          text: "Join me on What's the Move to discover amazing events on campus!",
          url: `https://app.whatsmove.com/profile/${user.id}`,
        });
      } catch (error) {
        // Fallback to clipboard
        copyReferralCode();
      }
    } else {
      copyReferralCode();
    }
  };

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
        <div className="flex items-center justify-between p-4">
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
                <Button size="sm" onClick={handleSaveProfile}>
                  <Save className="w-4 h-4 mr-1" />
                  Save
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
          <div className="h-32 bg-gradient-to-r from-purple-400 to-pink-400"></div>
          <CardContent className="relative -mt-12 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
              <ProfileImageUploader
                currentImageUrl={profileData.profileImageUrl}
                userName={`${user.firstName} ${user.lastName}`}
                onImageUpdate={(url) => setProfileData(prev => ({ ...prev, profileImageUrl: url }))}
              />
              
              <div className="flex-1 space-y-2">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-muted-foreground">
                    {user.university && user.graduationYear 
                      ? `${user.university} '${user.graduationYear}`
                      : user.email
                    }
                  </p>
                </div>
                
                {/* Stats */}
                <div className="flex space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.eventsHosted}</div>
                    <div className="text-xs text-muted-foreground">Events Hosted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600">{stats.eventsAttended}</div>
                    <div className="text-xs text-muted-foreground">Events Attended</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.friendsCount}</div>
                    <div className="text-xs text-muted-foreground">Friends</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio & Social */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              About Me
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Bio</label>
                  <Textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell people about yourself..."
                    className="mt-1"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {profileData.bio.length}/200 characters
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium flex items-center">
                      <Instagram className="w-4 h-4 mr-2" />
                      Instagram
                    </label>
                    <Input
                      value={profileData.instagramHandle}
                      onChange={(e) => setProfileData(prev => ({ ...prev, instagramHandle: e.target.value }))}
                      placeholder="@username"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium flex items-center">
                      <Twitter className="w-4 h-4 mr-2" />
                      Twitter
                    </label>
                    <Input
                      value={profileData.twitterHandle}
                      onChange={(e) => setProfileData(prev => ({ ...prev, twitterHandle: e.target.value }))}
                      placeholder="@username"
                      className="mt-1"
                    />
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
                
                {(profileData.instagramHandle || profileData.twitterHandle) && (
                  <div className="flex space-x-4">
                    {profileData.instagramHandle && (
                      <Badge variant="secondary" className="flex items-center">
                        <Instagram className="w-3 h-3 mr-1" />
                        {profileData.instagramHandle}
                      </Badge>
                    )}
                    {profileData.twitterHandle && (
                      <Badge variant="secondary" className="flex items-center">
                        <Twitter className="w-3 h-3 mr-1" />
                        {profileData.twitterHandle}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral System */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-700 dark:text-yellow-300">
              <Gift className="w-5 h-5 mr-2" />
              Refer Friends & Earn Rewards
            </CardTitle>
            <CardDescription>
              Invite friends to join What's the Move and unlock exclusive benefits!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border">
              <div>
                <p className="font-medium">Your Referral Code</p>
                <p className="text-sm text-muted-foreground">
                  Share this link with friends to earn rewards
                </p>
              </div>
              <Button onClick={copyReferralCode} variant="outline">
                <Copy className="w-4 h-4 mr-2" />
                {(user as any).referralCode || "Coming Soon"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Star className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="font-medium">Reward Points</span>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {stats.referralRewards}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Friends Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                Friends ({stats.friendsCount})
              </div>
              <Button 
                onClick={() => setLocation("/friends")}
                variant="outline" 
                size="sm"
              >
                Manage Friends
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Connect with friends to discover events together!</p>
              <Button 
                onClick={() => setLocation("/friends")}
                className="mt-4"
                variant="outline"
              >
                Find Friends
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <NotificationSettings />

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
              <div className={`text-center p-4 rounded-lg border ${stats.eventsHosted >= 1 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <Calendar className={`w-8 h-8 mx-auto mb-2 ${stats.eventsHosted >= 1 ? 'text-green-600' : 'text-gray-400'}`} />
                <p className="text-sm font-medium">First Event</p>
                <p className="text-xs text-muted-foreground">Host your first event</p>
              </div>
              
              <div className={`text-center p-4 rounded-lg border ${stats.friendsCount >= 5 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <Users className={`w-8 h-8 mx-auto mb-2 ${stats.friendsCount >= 5 ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="text-sm font-medium">Social Butterfly</p>
                <p className="text-xs text-muted-foreground">Add 5+ friends</p>
              </div>
              
              <div className={`text-center p-4 rounded-lg border ${stats.eventsAttended >= 10 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                <Heart className={`w-8 h-8 mx-auto mb-2 ${stats.eventsAttended >= 10 ? 'text-purple-600' : 'text-gray-400'}`} />
                <p className="text-sm font-medium">Event Lover</p>
                <p className="text-xs text-muted-foreground">Attend 10+ events</p>
              </div>
              
              <div className={`text-center p-4 rounded-lg border ${stats.referralRewards >= 100 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                <Gift className={`w-8 h-8 mx-auto mb-2 ${stats.referralRewards >= 100 ? 'text-yellow-600' : 'text-gray-400'}`} />
                <p className="text-sm font-medium">Influencer</p>
                <p className="text-xs text-muted-foreground">100+ referral points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}