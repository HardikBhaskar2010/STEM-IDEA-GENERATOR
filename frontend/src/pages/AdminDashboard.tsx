import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Trash2, Edit, Package, TrendingUp, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { componentService, type Component } from '@/services/componentService';
import { toast } from '@/hooks/use-toast';
import AddComponentForm from '@/components/AddComponentForm';
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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<{ id: string; name: string } | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  }, [isAdmin, authLoading, navigate]);

  // Load components
  useEffect(() => {
    if (isAdmin) {
      const unsubscribe = componentService.subscribeToComponents((updatedComponents) => {
        setComponents(updatedComponents);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [isAdmin]);

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

  // Calculate stats
  const stats = {
    totalComponents: components.length,
    inStock: components.filter(c => c.stock === 'In Stock').length,
    outOfStock: components.filter(c => c.stock === 'Out of Stock').length,
    categories: new Set(components.map(c => c.category)).size,
  };

  if (authLoading || !isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative min-h-screen pt-20">
        {/* Header */}
        <div className="relative mb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground text-lg">
                  Manage components and system settings
                </p>
              </div>
            </div>
            
            {/* Admin Badge */}
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
              <Shield className="w-3 h-3 mr-1" />
              Owner Account: {(user as any)?.email}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-effect border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Components</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalComponents}</div>
                <p className="text-xs text-muted-foreground">
                  Across {stats.categories} categories
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Stock</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.inStock}</div>
                <p className="text-xs text-muted-foreground">
                  Available components
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <Activity className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.outOfStock}</div>
                <p className="text-xs text-muted-foreground">
                  Need restocking
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.categories}</div>
                <p className="text-xs text-muted-foreground">
                  Component types
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="max-w-7xl mx-auto mb-8">
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your component inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setIsAddFormOpen(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold"
                data-testid="admin-add-component-button"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add New Component
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Component Management */}
        <div className="max-w-7xl mx-auto">
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle>Component Management</CardTitle>
              <CardDescription>
                View, edit, and delete components from your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : components.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No components yet. Add your first component!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {components.map((component) => (
                    <div
                      key={component.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                      data-testid={`admin-component-${component.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{component.name}</h3>
                          <Badge variant="secondary">{component.category}</Badge>
                          <Badge
                            variant={component.stock === 'In Stock' ? 'default' : 'destructive'}
                            className={
                              component.stock === 'In Stock'
                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                            }
                          >
                            {component.stock}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {component.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm font-bold text-primary">{component.price}</span>
                          {component.tags && component.tags.length > 0 && (
                            <div className="flex gap-1">
                              {component.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                          onClick={() => handleDeleteClick(component.id!, component.name)}
                          data-testid={`admin-delete-${component.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Component Form */}
      <AddComponentForm
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
        onSuccess={() => {
          toast({
            title: "Success!",
            description: "Component added successfully!",
          });
        }}
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
    </Layout>
  );
};

export default AdminDashboard;
