import React, { useState } from 'react';
import { Search, Filter, Cpu, Zap, Activity, Wifi, Battery, CircuitBoard, Plus, Trash2, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/layout/PageHeader';
import AddComponentForm from '@/components/AddComponentForm';
import ComponentDetailsModal from '@/components/ComponentDetailsModal';
import { componentService, type Component } from '@/services/componentService';
import { toast } from '@/hooks/use-toast';
import { usePreferences } from '@/contexts/PreferencesContext';
import { BackgroundCanvas3D } from '@/components/three/BackgroundCanvas3D';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { motion } from 'framer-motion';
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

const Components: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const { showPrice } = usePreferences();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Debug: Log auth state
  React.useEffect(() => {
    console.log('📦 Components Page - Auth State:', { isGuest, authLoading });
  }, [isGuest, authLoading]);
  
  // Component details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [componentDetails, setComponentDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load components from Supabase with real-time updates
  React.useEffect(() => {
    const unsubscribe = componentService.subscribeToComponents((updatedComponents) => {
      setComponents(updatedComponents);
      setIsLoading(false);
      setSupabaseConnected(true);
      
      // Show Supabase connection status
      if (updatedComponents.length === 0) {
        console.log('✅ Supabase connected! No components yet - try adding one.');
      } else {
        console.log(`✅ Supabase connected! Loaded ${updatedComponents.length} components.`);
      }
    }, category === 'all' ? undefined : category);

    return () => unsubscribe();
  }, [category]);

  const categories = [
    'All Categories',
    'Microcontroller',
    'Sensor',
    'Communication',
    'Power',
    'Motor Control',
    'Single Board Computer'
  ];

  // Use Supabase components only - no fallback mock data
  const displayComponents = components;

  const filteredComponents = displayComponents.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || component.category === category;
    return matchesSearch && matchesCategory;
  });

  // Handle delete component
  const handleDeleteClick = (id: string, name: string) => {
    setComponentToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!componentToDelete) return;

    try {
      await componentService.deleteComponent(componentToDelete.id);
      toast({
        title: "Component Deleted",
        description: `${componentToDelete.name} has been removed from the database.`,
      });
      setDeleteDialogOpen(false);
      setComponentToDelete(null);
    } catch (error) {
      console.error('Error deleting component:', error);
      toast({
        title: "Error",
        description: "Failed to delete component. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle component details
  const handleExploreDetails = async (componentId: string) => {
    // Check if guest - show login modal
    if (isGuest) {
      setShowLoginModal(true);
      return;
    }

    setSelectedComponentId(componentId);
    setDetailsModalOpen(true);
    setDetailsLoading(true);
    setComponentDetails(null);

    try {
      const details = await componentService.getComponentDetails(componentId);
      setComponentDetails(details);
    } catch (error) {
      console.error('Error fetching component details:', error);
      toast({
        title: "Error",
        description: "Failed to load component details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedComponentId(null);
    setComponentDetails(null);
    setDetailsLoading(false);
  };

  return (
    <Layout>
      <div className="relative min-h-screen pt-20">
        {/* 3D Background */}
        <BackgroundCanvas3D density="low" className="opacity-20" />
        
        {/* Supabase Connection Status - Sticky Badge */}
        {supabaseConnected && (
          <div className="fixed top-24 right-4 z-40 animate-fade-in">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 backdrop-blur-md px-3 py-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              Supabase Live
            </Badge>
          </div>
        )}
        
        {/* Guest Mode Banner */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto mb-8"
          >
            <Card className="glass-effect border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-violet-900/20 to-purple-900/20">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Browsing as Guest</p>
                    <p className="text-sm text-gray-300">Sign in to add components and view full details</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-medium px-6 rounded-xl"
                  data-testid="guest-banner-signin-button"
                >
                  <Sparkles className="mr-2 w-4 h-4" />
                  Sign In
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        <div className="relative mb-12">
          {/* Ambient background glow */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-secondary">
                  <CircuitBoard className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-widest">Inventory</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                  Component Database
                </h1>
                <p className="text-muted-foreground text-lg max-w-lg">
                  Browse and manage your collection of electronic modules and sensors.
                </p>
              </div>
              
              <Button 
                className="bg-gradient-secondary text-white shadow-glow-secondary hover:shadow-glow-lg transition-all duration-300 rounded-xl h-14 px-8 text-lg font-bold"
                onClick={() => {
                  if (isGuest) {
                    setShowLoginModal(true);
                  } else {
                    setIsAddFormOpen(true);
                  }
                }}
                data-testid="add-module-button"
              >
                <Plus className="mr-2 h-6 w-6" />
                {isGuest ? 'Sign In to Add' : 'Add Module'}
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="max-w-6xl mx-auto mb-12">
          <Card className="glass-effect border-white/5 p-4 rounded-2xl">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Search modules, chips, or specifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-white/10 bg-white/5 focus:bg-white/10 transition-all"
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full md:w-[240px] h-12 rounded-xl border-white/10 bg-white/5">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.slice(1).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* Component Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="glass-effect border-border/50">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredComponents.map((component, index) => {
            // Handle both Supabase and mock data structures
            const Icon = (component as any).icon || CircuitBoard;
            const stockValue = (component as any).stock || 'In Stock';
            const isInStock = stockValue === 'In Stock';
            const isLimited = stockValue === 'Limited';
            const stockText = stockValue;
            
            return (
              <div key={(component as any).id} className="relative">
                <Card 
                  className={`group glass-effect border-border/50 ${isGuest ? 'opacity-90' : ''}`}
                  enableAnimation={true}
                  enableHover={!isGuest}
                  animationDelay={index * 50}
                >
                  {/* Guest Blur Overlay */}
                  {isGuest && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-lg z-10 pointer-events-none flex items-center justify-center">
                      <div className="absolute top-3 right-3">
                        <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30 backdrop-blur-sm">
                          <Lock className="w-3 h-3 mr-1" />
                          Sign in
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-12 h-12 ${(component as any).color || 'bg-gradient-primary'} rounded-lg flex items-center justify-center group-hover:animate-glow-pulse`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {(component as any).category}
                      </Badge>
                      <Badge 
                        variant={isInStock || isLimited ? 'default' : 'secondary'}
                        className={
                          isInStock ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                          isLimited ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }
                      >
                        {stockText}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{(component as any).name}</CardTitle>
                  <CardDescription className="line-clamp-2">{(component as any).description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4 min-h-[32px]">
                    {showPrice ? (
                      <span className="text-2xl font-bold text-gradient">
                        {(component as any).price || 'Price TBD'}
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-xs">Student mode: prices hidden</Badge>
                    )}
                    {(component as any).stockCount !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        Stock: {(component as any).stockCount}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Display specifications if available (Supabase data) */}
                  {(component as any).specifications && Object.keys((component as any).specifications).length > 0 && (
                    <div className="space-y-2 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      {Object.entries((component as any).specifications).slice(0, 3).map(([key, value]) => (
                        <div key={key as string} className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-bold uppercase tracking-tighter">{key}:</span>
                          <span className="font-medium">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Display tags */}
                  {(component as any).tags && (component as any).tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {(component as any).tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] font-bold uppercase tracking-tight bg-secondary/10 text-secondary border-secondary/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-gradient-primary text-white rounded-xl font-bold shadow-glow"
                      ripple={true}
                      onClick={() => handleExploreDetails((component as any).id)}
                    >
                      {isGuest ? 'Sign In to Explore' : 'Explore Details'}
                    </Button>
                    
                    {/* Only show delete button for Supabase components (they have string IDs) */}
                    {typeof (component as any).id === 'string' && supabaseConnected && (
                      <Button 
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick((component as any).id, (component as any).name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              </div>
            );
          })}
          </div>
        )}

        {/* No Results */}
        {filteredComponents.length === 0 && (
          <div className="text-center py-12">
            <Cpu className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">
              {components.length === 0 && supabaseConnected ? 'No components in database yet' : 'No components found'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {components.length === 0 && supabaseConnected 
                ? 'Click "Add Component" to add your first component to Supabase!' 
                : 'Try adjusting your search or filters'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add Component Form */}
      <AddComponentForm
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
        onSuccess={() => {
          // Components will automatically update via real-time subscription
          toast({
            title: "Success!",
            description: "Component added successfully and is now live!",
          });
        }}
      />

      {/* Component Details Modal */}
      <ComponentDetailsModal
        isOpen={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        component={componentDetails}
        isLoading={detailsLoading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{componentToDelete?.name}</span> from the database.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setComponentToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Component
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Login Modal for Guest Users */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        feature="component details"
        message="Sign in to explore detailed specifications, datasheets, and purchase links for components."
      />
    </Layout>
  );
};

export default Components;
