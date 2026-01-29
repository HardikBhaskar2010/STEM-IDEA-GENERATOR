import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Settings, LogOut, Save, Camera, Eye, EyeOff, School, Palette, Check, Zap, Lock, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/layout/Layout';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { usePreferences, COLOR_THEMES, ColorTheme } from '@/contexts/PreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePerf } from '@/contexts/PerfContext';
import { authService } from '@/services/authService';
import PreferencesDialog from '@/components/PreferencesDialog';
import PrivacySettingsDialog from '@/components/PrivacySettingsDialog';
import EmailPreferencesDialog from '@/components/EmailPreferencesDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Define project type
interface Project {
  id: number | string;
  title: string;
  description: string;
  status: string;
  progress: number;
  difficulty: string;
  tags: string[];
}

// Define achievement type
interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  condition: (projects: Project[]) => boolean;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { userMode, setUserMode, colorTheme, setColorTheme } = usePreferences();
  const { user } = useAuth();
  const { lowPerf, setLowPerf, suggested } = usePerf();
  const [projects, setProjects] = useState<Project[]>([]);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const isGuest = user && authService.isGuestUser(user);
  
  const [userData, setUserData] = useState({
    name: user?.email?.split('@')[0] || 'STEM Maker',
    email: user?.email || 'maker@example.com',
    bio: 'Passionate about electronics and IoT. Always looking for the next exciting project to build!',
    skills: ['Arduino', 'Raspberry Pi', 'IoT', '3D Printing', 'Circuit Design'],
    joinDate: 'January 2024',
  });

  // Load projects to calculate stats
  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem('user_projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);

  // Calculate real stats from projects
  const projectsCompleted = projects.filter(p => p.status === 'Completed').length;
  const projectsInProgress = projects.filter(p => p.status === 'In Progress').length;
  const totalProjects = projects.length;

  // Define achievements with real conditions
  const achievementDefinitions: Achievement[] = [
    { 
      id: 1, 
      title: 'First Project', 
      description: 'Complete your first project', 
      icon: '🎯', 
      unlocked: false,
      condition: (projs) => projs.filter(p => p.status === 'Completed').length >= 1
    },
    { 
      id: 2, 
      title: 'Project Starter', 
      description: 'Start 3 projects', 
      icon: '🚀', 
      unlocked: false,
      condition: (projs) => projs.length >= 3
    },
    { 
      id: 3, 
      title: 'IoT Explorer', 
      description: 'Create an IoT project', 
      icon: '📡', 
      unlocked: false,
      condition: (projs) => projs.some(p => p.tags?.some(t => t.toLowerCase().includes('iot')))
    },
    { 
      id: 4, 
      title: 'Robotics Builder', 
      description: 'Create a robotics project', 
      icon: '🤖', 
      unlocked: false,
      condition: (projs) => projs.some(p => p.tags?.some(t => t.toLowerCase().includes('robot')))
    },
    { 
      id: 5, 
      title: 'Dedicated Maker', 
      description: 'Complete 5 projects', 
      icon: '💡', 
      unlocked: false,
      condition: (projs) => projs.filter(p => p.status === 'Completed').length >= 5
    },
    { 
      id: 6, 
      title: 'Master Builder', 
      description: 'Complete 10 projects', 
      icon: '🏆', 
      unlocked: false,
      condition: (projs) => projs.filter(p => p.status === 'Completed').length >= 10
    }
  ];

  // Calculate which achievements are unlocked
  const achievements = achievementDefinitions.map(achievement => ({
    ...achievement,
    unlocked: achievement.condition(projects)
  }));

  const handleSaveProfile = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const handleLogout = async () => {
    const { error } = await authService.signOut();
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Logged Out",
      description: isGuest ? "Guest session cleared." : "You have been successfully logged out.",
    });
    
    // Redirect to home page
    navigate('/');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-primary rounded-2xl shadow-glow animate-glow-pulse">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Your Profile</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Manage your account and track your maker journey
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="glass-effect mx-auto grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <Card className="lg:col-span-1 glass-effect border-border/50 animate-fade-in">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <Avatar className="w-32 h-32">
                        <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" />
                        <AvatarFallback>JM</AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <Button
                          size="icon"
                          className="absolute bottom-0 right-0 rounded-full bg-gradient-primary text-white hover-lift click-spark"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{userData.name}</h2>
                    <p className="text-muted-foreground mb-4">{userData.email}</p>
                    <div className="flex items-center text-sm text-muted-foreground mb-6">
                      <Calendar className="w-4 h-4 mr-1" />
                      Joined {userData.joinDate}
                    </div>
                    {/* Current Mode Indicator */}
                    <Badge variant="outline" className="mb-4">
                      {userMode === 'student' ? (
                        <span className="flex items-center gap-1"><School className="w-3.5 h-3.5" /> Student Mode</span>
                      ) : (
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Prices Visible</span>
                      )}
                    </Badge>
                    
                    {/* Stats */}
                    <div className="w-full space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="text-sm">Total Projects</span>
                        <span className="font-bold text-gradient">{totalProjects}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="text-sm">Completed</span>
                        <span className="font-bold text-gradient-secondary">{projectsCompleted}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="text-sm">In Progress</span>
                        <span className="font-bold text-gradient">{projectsInProgress}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Details */}
              <Card className="lg:col-span-2 glass-effect border-border/50 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Profile Information</CardTitle>
                    {!isEditing ? (
                      <Button 
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="click-spark"
                      >
                        Edit Profile
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveProfile}
                          className="bg-gradient-primary text-white hover-lift click-spark"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                        <Button 
                          onClick={() => setIsEditing(false)}
                          variant="outline"
                          className="click-spark"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={userData.name}
                      onChange={(e) => setUserData({...userData, name: e.target.value})}
                      disabled={!isEditing}
                      className="click-spark"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({...userData, email: e.target.value})}
                      disabled={!isEditing}
                      className="click-spark"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={userData.bio}
                      onChange={(e) => setUserData({...userData, bio: e.target.value})}
                      disabled={!isEditing}
                      className="min-h-[100px] click-spark"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Skills & Interests</Label>
                    <div className="flex flex-wrap gap-2">
                      {userData.skills.map((skill, index) => (
                        <Badge 
                          key={index}
                          variant="outline"
                          className="px-3 py-1"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {isEditing && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 click-spark"
                        >
                          + Add Skill
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>Your Achievements</CardTitle>
                <CardDescription>
                  Track your progress and unlock new badges as you complete projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement, index) => (
                    <div
                      key={achievement.id}
                      className={`
                        p-4 rounded-lg border transition-all animate-scale-in
                        ${achievement.unlocked 
                          ? 'bg-gradient-primary/10 border-primary/50 hover-lift' 
                          : 'bg-muted/50 border-border opacity-50'
                        }
                      `}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <h4 className="font-semibold mb-1">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      {achievement.unlocked && (
                        <Badge className="mt-2 bg-gradient-primary text-white">
                          Unlocked
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Low Performance Mode toggle */}
                <div className="flex items-start justify-between gap-6 p-4 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      Low Performance Mode
                      {suggested && (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Disables heavy visuals and animations to improve performance on slower devices.
                    </div>
                    {lowPerf && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400">
                        <Zap className="w-3 h-3" />
                        <span>Optimized mode active</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={lowPerf}
                      onCheckedChange={(val) => {
                        setLowPerf(val);
                        toast({
                          title: val ? "Low Performance Mode Enabled" : "Low Performance Mode Disabled",
                          description: val 
                            ? "Animations and effects have been reduced for better performance." 
                            : "Full animations and effects restored.",
                        });
                      }}
                      aria-label="Toggle Low Performance Mode"
                      data-testid="low-perf-toggle"
                    />
                  </div>
                </div>

                {/* Price visibility toggle */}
                <div className="flex items-start justify-between gap-6 p-4 rounded-lg border">
                  <div>
                    <div className="font-medium">Student Mode</div>
                    <div className="text-sm text-muted-foreground">Hide component prices across the app (useful for lab environments where students don’t need prices).</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <School className={`w-4 h-4 ${userMode === 'student' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Switch
                      checked={userMode === 'student'}
                      onCheckedChange={(val) => setUserMode(val ? 'student' : 'normal')}
                      aria-label="Toggle Student Mode"
                    />
                    {userMode === 'student' ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-foreground" />}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Current: {userMode === 'student' ? 'Student Mode (prices hidden)' : 'Normal Mode (prices visible)'}
                </div>

                {/* Color Theme Selector */}
                <Button 
                  variant="outline" 
                  className="w-full justify-start click-spark"
                  onClick={() => setColorDialogOpen(true)}
                >
                  <Palette className="mr-2 h-4 w-4" />
                  Color Theme
                  <Badge variant="secondary" className="ml-auto">
                    {COLOR_THEMES[colorTheme].name}
                  </Badge>
                </Button>

                <Button variant="outline" className="w-full justify-start click-spark"
                  onClick={() => setPreferencesDialogOpen(true)}
                  data-testid="preferences-button">
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </Button>
                <Button variant="outline" className="w-full justify-start click-spark"
                  onClick={() => setPrivacyDialogOpen(true)}
                  data-testid="privacy-button">
                  <Lock className="mr-2 h-4 w-4" />
                  Privacy Settings
                </Button>
                <Button variant="outline" className="w-full justify-start click-spark"
                  onClick={() => setEmailDialogOpen(true)}
                  data-testid="email-notifications-button"
                  disabled={isGuest}>
                  <Bell className="mr-2 h-4 w-4" />
                  Email Notifications
                  {isGuest && <Badge variant="outline" className="ml-auto text-xs">Account Required</Badge>}
                </Button>
                <Button 
                  onClick={() => setLogoutDialogOpen(true)}
                  variant="outline" 
                  className="w-full justify-start text-destructive hover:bg-destructive/10 click-spark"
                  data-testid="logout-button"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Color Theme Dialog */}
      <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Choose Color Theme
            </DialogTitle>
            <DialogDescription>
              Select a color theme to personalize your app experience
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {Object.entries(COLOR_THEMES).map(([key, theme]) => {
              const isSelected = colorTheme === key;
              // Convert HSL string to proper format for style
              const hslColor = `hsl(${theme.primary})`;
              
              return (
                <button
                  key={key}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    hover:scale-105 hover:shadow-lg
                    flex flex-col items-center gap-3
                    ${isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => {
                    setColorTheme(key as ColorTheme);
                    toast({
                      title: "Theme Changed!",
                      description: `Switched to ${theme.name}`,
                    });
                    setColorDialogOpen(false);
                  }}
                >
                  {/* Color Preview Circle */}
                  <div className="flex gap-1">
                    <div 
                      className="w-10 h-10 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110"
                      style={{ backgroundColor: hslColor }}
                    />
                  </div>
                  
                  {/* Theme Name */}
                  <div className="text-center">
                    <div className="font-semibold text-sm">{theme.name}</div>
                    <div className="text-xs text-muted-foreground">{theme.description}</div>
                  </div>
                  
                  {/* Selected Check Mark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preferences Dialog */}
      <PreferencesDialog 
        open={preferencesDialogOpen} 
        onOpenChange={setPreferencesDialogOpen} 
      />

      {/* Privacy Settings Dialog */}
      <PrivacySettingsDialog 
        open={privacyDialogOpen} 
        onOpenChange={setPrivacyDialogOpen} 
      />

      {/* Email Preferences Dialog */}
      <EmailPreferencesDialog 
        open={emailDialogOpen} 
        onOpenChange={setEmailDialogOpen} 
      />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              {isGuest 
                ? "Your guest session data will be cleared. Consider creating an account to save your progress."
                : "You will need to log in again to access your account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Profile;
