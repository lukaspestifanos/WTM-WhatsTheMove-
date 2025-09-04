import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { 
  Search, 
  UserPlus, 
  Users, 
  Share2, 
  Copy,
  Heart,
  MessageCircle,
  Star,
  Gift,
  ArrowLeft,
  Check,
  X,
  Send
} from "lucide-react";

interface Friend {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  university?: string;
  graduationYear?: number;
  mutualFriends?: number;
}

interface FriendRequest {
  id: string;
  sender: Friend;
  message?: string;
  createdAt: string;
}

export default function EnhancedFriends() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("friends");

  // Mock data for demonstration
  useEffect(() => {
    // Mock friends data
    const mockFriends: Friend[] = [
      {
        id: "1",
        firstName: "Emma",
        lastName: "Johnson",
        email: "emma.j@university.edu",
        university: "UC Campus",
        graduationYear: 2025,
        mutualFriends: 3
      },
      {
        id: "2", 
        firstName: "Marcus",
        lastName: "Williams",
        email: "marcus.w@university.edu",
        university: "UC Campus",
        graduationYear: 2024,
        mutualFriends: 5
      }
    ];

    const mockRequests: FriendRequest[] = [
      {
        id: "1",
        sender: {
          id: "3",
          firstName: "Sarah",
          lastName: "Chen",
          email: "sarah.c@university.edu",
          university: "UC Campus",
          graduationYear: 2026
        },
        message: "Hey! We're in the same CS class. Would love to connect!",
        createdAt: "2025-09-04T12:00:00Z"
      }
    ];

    setFriends(mockFriends);
    setFriendRequests(mockRequests);
  }, []);

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // This would be an actual API call
      const mockResults: Friend[] = [
        {
          id: "4",
          firstName: "Alex",
          lastName: "Rodriguez",
          email: "alex.r@university.edu",
          university: "UC Campus",
          graduationYear: 2025,
          mutualFriends: 2
        },
        {
          id: "5",
          firstName: "Jordan",
          lastName: "Taylor",
          email: "jordan.t@university.edu",
          university: "UC Campus",
          graduationYear: 2024,
          mutualFriends: 1
        }
      ].filter(user => 
        user.firstName.toLowerCase().includes(query.toLowerCase()) ||
        user.lastName.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(mockResults);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to search users right now",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      // Mock API call
      toast({
        title: "Friend Request Sent!",
        description: "Your friend request has been sent successfully",
      });
      
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Unable to send friend request",
        variant: "destructive",
      });
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      // Mock API call
      const request = friendRequests.find(r => r.id === requestId);
      if (request) {
        setFriends(prev => [...prev, request.sender]);
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        
        toast({
          title: "Friend Added!",
          description: `You and ${request.sender.firstName} are now friends`,
        });
      }
    } catch (error) {
      toast({
        title: "Accept Failed",
        description: "Unable to accept friend request",
        variant: "destructive",
      });
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    try {
      setFriendRequests(prev => prev.filter(r => r.id !== requestId));
      toast({
        title: "Request Declined",
        description: "Friend request has been declined",
      });
    } catch (error) {
      toast({
        title: "Decline Failed", 
        description: "Unable to decline friend request",
        variant: "destructive",
      });
    }
  };

  const shareApp = async () => {
    const shareText = `Join me on What's the Move! 🎉 The best way to discover amazing campus events. Get the app: https://app.whatsmove.com`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "What's the Move - Campus Events",
          text: shareText,
          url: "https://app.whatsmove.com"
        });
      } catch (error) {
        // Fallback to clipboard
        copyShareLink();
      }
    } else {
      copyShareLink();
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText("Join me on What's the Move! 🎉 https://app.whatsmove.com");
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually: https://app.whatsmove.com",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
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
            <h1 className="text-xl font-bold">Friends</h1>
          </div>
          
          <Button onClick={shareApp} size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Share2 className="w-4 h-4 mr-2" />
            Invite Friends
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Viral Growth Card */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
          <CardHeader>
            <CardTitle className="flex items-center text-purple-700 dark:text-purple-300">
              <Gift className="w-5 h-5 mr-2" />
              Spread the Word & Earn Rewards!
            </CardTitle>
            <CardDescription>
              Invite friends to discover amazing campus events together
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold text-blue-600">{friends.length}</div>
                <div className="text-sm text-muted-foreground">Friends</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold text-yellow-600">250</div>
                <div className="text-sm text-muted-foreground">Reward Points</div>
              </div>
              
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold text-red-600">12</div>
                <div className="text-sm text-muted-foreground">Events Shared</div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={shareApp} className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share App
              </Button>
              <Button onClick={copyShareLink} variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Friend Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends" className="relative">
              Friends
              {friends.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Requests
              {friendRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs bg-red-100 text-red-700">
                  {friendRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search">Find Friends</TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  My Friends ({friends.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No friends yet! Start by searching for classmates.</p>
                    <Button 
                      onClick={() => setActiveTab("search")}
                      className="mt-4"
                      variant="outline"
                    >
                      Find Friends
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={friend.profileImageUrl} />
                            <AvatarFallback>{getInitials(friend.firstName, friend.lastName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.firstName} {friend.lastName}</p>
                            <p className="text-sm text-muted-foreground">
                              {friend.university && friend.graduationYear 
                                ? `${friend.university} '${friend.graduationYear}`
                                : friend.email
                              }
                            </p>
                            {friend.mutualFriends && friend.mutualFriends > 0 && (
                              <p className="text-xs text-blue-600">
                                {friend.mutualFriends} mutual friend{friend.mutualFriends !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Friend Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Friend Requests ({friendRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {friendRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending friend requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <Avatar>
                              <AvatarImage src={request.sender.profileImageUrl} />
                              <AvatarFallback>{getInitials(request.sender.firstName, request.sender.lastName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{request.sender.firstName} {request.sender.lastName}</p>
                              <p className="text-sm text-muted-foreground">
                                {request.sender.university && request.sender.graduationYear 
                                  ? `${request.sender.university} '${request.sender.graduationYear}`
                                  : request.sender.email
                                }
                              </p>
                              {request.message && (
                                <p className="text-sm mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                                  "{request.message}"
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => acceptFriendRequest(request.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => declineFriendRequest(request.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="w-5 h-5 mr-2" />
                  Find Friends
                </CardTitle>
                <CardDescription>
                  Search for classmates and connect with people at your university
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
                
                {isSearching && (
                  <div className="text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={user.profileImageUrl} />
                            <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.university && user.graduationYear 
                                ? `${user.university} '${user.graduationYear}`
                                : user.email
                              }
                            </p>
                            {user.mutualFriends && user.mutualFriends > 0 && (
                              <p className="text-xs text-blue-600">
                                {user.mutualFriends} mutual friend{user.mutualFriends !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => sendFriendRequest(user.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Add Friend
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found matching "{searchQuery}"</p>
                    <p className="text-sm mt-2">Try a different search term</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}