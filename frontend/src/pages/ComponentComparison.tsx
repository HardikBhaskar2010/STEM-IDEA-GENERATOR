import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from '@/hooks/use-toast';

interface ComponentForComparison {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  specs: Record<string, string>;
}

const ComponentComparison: React.FC = () => {
  const navigate = useNavigate();
  const [components, setComponents] = useState<ComponentForComparison[]>([]);
  const [newComponent, setNewComponent] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
  });

  const addComponent = () => {
    if (!newComponent.name || !newComponent.category) {
      toast({
        title: 'Missing fields',
        description: 'Please enter component name and category',
        variant: 'destructive',
      });
      return;
    }

    const component: ComponentForComparison = {
      id: Math.random().toString(),
      name: newComponent.name,
      category: newComponent.category,
      price: newComponent.price || 'N/A',
      description: newComponent.description,
      specs: {},
    };

    setComponents([...components, component]);
    setNewComponent({ name: '', category: '', price: '', description: '' });
    toast({
      title: 'Component added',
      description: `${component.name} added to comparison`,
    });
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id));
  };

  const exportComparison = () => {
    const csv = [
      ['Component Name', 'Category', 'Price', 'Description'].join(','),
      ...components.map(c => [c.name, c.category, c.price, c.description].map(v => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component-comparison.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <PageHeader
        title="Component Comparison"
        description="Compare multiple components side by side to make the best choice"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/components')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </PageHeader>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Add Component Form */}
          <Card className="glass-effect border-border/50">
            <CardHeader>
              <CardTitle>Add Component to Compare</CardTitle>
              <CardDescription>Add multiple components to compare their specifications and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Component Name</label>
                  <Input
                    placeholder="e.g., Arduino Uno R3"
                    value={newComponent.name}
                    onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    placeholder="e.g., Microcontroller"
                    value={newComponent.category}
                    onChange={(e) => setNewComponent({ ...newComponent, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Price</label>
                  <Input
                    placeholder="e.g., $25.00"
                    value={newComponent.price}
                    onChange={(e) => setNewComponent({ ...newComponent, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Brief description"
                    value={newComponent.description}
                    onChange={(e) => setNewComponent({ ...newComponent, description: e.target.value })}
                  />
                </div>
              </div>
              <Button
                onClick={addComponent}
                className="w-full bg-gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </Button>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          {components.length > 0 ? (
            <>
              <Card className="glass-effect border-border/50 overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Comparison Results</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportComparison}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">Component</th>
                          <th className="text-left py-3 px-4 font-semibold">Category</th>
                          <th className="text-left py-3 px-4 font-semibold">Price</th>
                          <th className="text-left py-3 px-4 font-semibold">Description</th>
                          <th className="text-left py-3 px-4 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((component, index) => (
                          <tr key={component.id} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                            <td className="py-3 px-4 font-medium">{component.name}</td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary">{component.category}</Badge>
                            </td>
                            <td className="py-3 px-4 font-semibold text-gradient">{component.price}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{component.description}</td>
                            <td className="py-3 px-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeComponent(component.id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Card */}
              <Card className="glass-effect border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Components</p>
                      <p className="text-3xl font-bold text-primary">{components.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price Range</p>
                      <p className="text-3xl font-bold text-secondary">
                        {components.length > 0 ? 'Calculated' : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Categories</p>
                      <p className="text-3xl font-bold text-accent">
                        {new Set(components.map(c => c.category)).size}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-effect border-border/50">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No components added yet</p>
                <p className="text-sm text-muted-foreground">Add components above to start comparing</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ComponentComparison;
